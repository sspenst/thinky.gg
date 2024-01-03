import { ValidEnum, ValidNumber, ValidObjectId, ValidType } from '@root/helpers/apiWrapper';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import isPro from '@root/helpers/isPro';
import { logger } from '@root/helpers/logger';
import User from '@root/models/db/user';
import UserConfig from '@root/models/db/userConfig';
import { USER_DEFAULT_PROJECTION } from '@root/models/schemas/userSchema';
import Stripe from 'stripe';
import withAuth from '../../../lib/withAuth';
import { UserConfigModel, UserModel } from '../../../models/mongoose';
import { stripe } from '.';

export interface SubscriptionGiftData {
  cancel_at: number;
  cancel_at_period_end: boolean;
  current_period_end: number;
  current_period_start: number;
  giftFromUser: User;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  planName: string;
  status: Stripe.Subscription.Status;
  subscriptionId: string;
}

export enum GiftType {
  Monthly = 'gift_monthly',
  Yearly = 'gift_yearly',
}

export default withAuth({
  GET: {},
  POST: {
    body: {
      type: ValidEnum(Object.values(GiftType), true),
      quantity: ValidNumber(true, 1, 24, 1),
      giftTo: ValidObjectId(true),
      paymentMethodId: ValidType('string', true),
    }
  },
}, async (req, res) => {
  if (req.method === 'GET') {
    // query stripe for any subscription with giftToId === req.userId
    // return the list of subscriptions

    // filter for active
    const subscriptions = await stripe.subscriptions.search({
      query: `metadata["giftToId"]:"${req.userId}" AND status:"active"`,
      limit: 100
    });

    const subscriptionData = [];

    for (const subscription of subscriptions.data) {
      const plan = await stripe.plans.retrieve(subscription.items.data[0].plan.id);
      const product = await stripe.products.retrieve(plan.product as string);
      const planName = product.name;
      const giftFromUser = await UserModel.findById(subscription.metadata.giftFromId, USER_DEFAULT_PROJECTION).lean<User>();

      subscriptionData.push( {
        subscriptionId: subscription.id,
        planName: planName,
        giftFromUser: giftFromUser,
        metadata: subscription.metadata,
        current_period_end: subscription.current_period_end,
        current_period_start: subscription.current_period_start,
        status: subscription.status,
        cancel_at: subscription.cancel_at,
        cancel_at_period_end: subscription.cancel_at_period_end,
      } as SubscriptionGiftData
      );
    }

    return res.status(200).json(
      subscriptionData
    );
  } else if (req.method === 'POST') {
    const { type, giftTo, quantity, paymentMethodId } = req.body as { type: GiftType, giftTo: string, quantity: number, paymentMethodId: string };

    // make sure this user is on Pro

    if (!isPro(req.user)) {
      return res.status(400).json({ error: 'You must be a Pro user to gift a subscription.' });
    }

    if (req.userId === giftTo) {
      return res.status(400).json({ error: 'You cannot gift a subscription to yourself.' });
    }

    const userToGift = await UserModel.findById(giftTo, USER_DEFAULT_PROJECTION).lean<User>();

    if (!userToGift) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (isPro(userToGift)) {
      return res.status(400).json({ error: 'You cannot gift a subscription to ' + userToGift.name + ' because they are already on Pro.' });
    }

    const gameId = req.gameId;
    const game = getGameFromId(gameId);
    const paymentPriceIdTable = {
      [GiftType.Monthly]: game.stripeGiftPriceIdMonthly,
      [GiftType.Yearly]: game.stripeGiftPriceIdYearly,
    };

    try {
      const price = paymentPriceIdTable[type];

      // check if customer id exists for this req.user
      const user = await UserModel.findOne({ _id: req.userId }, { stripeCustomerId: 1 }).lean<User>();
      const customerId = user?.stripeCustomerId;

      if (!customerId) {
        return res.status(404).json({ error: 'No subscription found for this user.' });
      }

      const customer = await stripe.customers.retrieve(customerId);

      if (!customer) {
        return res.status(404).json({ error: 'No customer found for this user.' });
      }

      const giftLengthTable = {
        [GiftType.Monthly]: 60 * 60 * 24 * 30 * quantity,
        [GiftType.Yearly]: 60 * 60 * 24 * 365 * quantity,
      };

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        cancel_at: Math.floor(Date.now() / 1000) + giftLengthTable[type],
        items: [
          // quantity needs to be ONE here so we are only billed for one subscription. the cancel_at is where the length of the subscription is set
          { price: price, quantity: 1 },
        ],
        default_payment_method: paymentMethodId,
        metadata: {
          giftFromId: req.userId,
          giftToId: giftTo,
          type: type,
          quantity,
        },
      });

      // Respond with the client secret
      res.status(200).json({
        subscription
      });
    } catch (error) {
      // Log the error and respond with a generic message
      logger.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
);
