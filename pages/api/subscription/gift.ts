import { ValidEnum, ValidNumber, ValidObjectId, ValidType } from '@root/helpers/apiWrapper';
import User from '@root/models/db/user';
import { USER_DEFAULT_PROJECTION } from '@root/models/schemas/userSchema';
import Stripe from 'stripe';
import withAuth from '../../../lib/withAuth';
import { UserConfigModel, UserModel } from '../../../models/mongoose';

const STRIPE_SECRET = process.env.STRIPE_SECRET as string;

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;
export const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2022-11-15' });

export interface SubscriptionGiftData {
    subscriptionId: string;
    planName: string;
    giftFromUser: User;
    metadata: any,
    current_period_end: number;
    current_period_start: number;
    cancel_at: number;
    status: Stripe.Subscription.Status;
}
export default withAuth({
  GET: {

  },
  POST: {
    body: {
      type: ValidEnum(['gift_monthly'], true),
      quantity: ValidNumber(true, 1, 24, 1),
      giftTo: ValidObjectId(true),
      paymentMethodId: ValidType('string', true),
    }
  },
}, async (req, res) => {
  if (req.method === 'GET') {
    // query stripe for any subscription with giftToId === req.userId
    // return the list of subscriptions

    const subscriptions = await stripe.subscriptions.search({
      query: `metadata["giftToId"]:"${req.userId}"`,
      limit: 100
    });

    const subscriptionData = [];

    for (const subscription of subscriptions.data) {
      const plan = await stripe.plans.retrieve(subscription.items.data[0].plan.id);
      const product = await stripe.products.retrieve(plan.product as string);
      const planName = product.name;
      const giftFromUser = await UserModel.findById(subscription.metadata.giftFromId, USER_DEFAULT_PROJECTION, { lean: true });

      subscriptionData.push( {
        subscriptionId: subscription.id,
        planName: planName,
        giftFromUser: giftFromUser,
        metadata: subscription.metadata,
        current_period_end: subscription.current_period_end,
        current_period_start: subscription.current_period_start,
        status: subscription.status,
        cancel_at: subscription.cancel_at,
      } as SubscriptionGiftData
      );
    }

    return res.status(200).json(
      subscriptionData
    );
  } else if (req.method === 'POST') {
    const { type, giftTo, quantity, paymentMethodId } = req.body as { type: 'gift_monthly', giftTo: string, quantity: number, paymentMethodId: string };

    const paymentPriceIdTable = {
      gift_monthly: 'price_1NzVzVCFMgRTdOcaHxG7tPgy',

    };

    try {
      // Create a new PaymentIntent object

      // fetch the price id from stripe based on the name

      const price = paymentPriceIdTable[type];
      // check if customer id exists for this req.user
      const userConfig = await UserConfigModel.findOne({ userId: req.userId }, { stripeCustomerId: 1 }, { lean: true });
      const customerId = userConfig?.stripeCustomerId;

      if (!customerId) {
        return res.status(404).json({ error: 'No subscription found for this user.' });
      }

      const customer = await stripe.customers.retrieve(customerId);

      if (!customer) {
        return res.status(404).json({ error: 'No customer found for this user.' });
      }

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        cancel_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 * quantity,
        items: [
          { price: price, quantity: quantity },
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
      console.log('>>>>>', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
);
