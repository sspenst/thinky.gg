import { ProSubscriptionType } from '@root/constants/ProSubscriptionType';
import { ValidEnum, ValidType } from '@root/helpers/apiWrapper';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import isPro from '@root/helpers/isPro';
import { logger } from '@root/helpers/logger';
import cleanUser from '@root/lib/cleanUser';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import User from '@root/models/db/user';
import Stripe from 'stripe';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { UserModel } from '../../../models/mongoose';

const STRIPE_SECRET = process.env.STRIPE_SECRET as string;

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;
export const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2024-04-10' });

export interface SubscriptionData {
  cancel_at: number | null;
  cancel_at_period_end: boolean;
  current_period_end: number;
  current_period_start: number;
  giftToUser?: User | null;
  paymentMethod: Stripe.PaymentMethod | null;
  plan: Stripe.Plan;
  planName: string;
  status: Stripe.Subscription.Status;
  subscriptionId: string;
}

export async function getSubscriptions(req: NextApiRequestWithAuth): Promise<[number, { error: string } | SubscriptionData[], paymentMethods?: Stripe.PaymentMethod[]]> {
  const userId = req.userId;
  const user = await UserModel.findOne({ _id: userId }, { stripeCustomerId: 1 }).lean<User>();

  let subscriptionsNormal: Stripe.Response<Stripe.ApiList<Stripe.Subscription>> | undefined;
  let subscriptionsGifts: Stripe.Response<Stripe.ApiSearchResult<Stripe.Subscription>>;

  try {
    [subscriptionsNormal, subscriptionsGifts] = await Promise.all([
      user?.stripeCustomerId ? stripe.subscriptions.list({ customer: user.stripeCustomerId }) : undefined,
      stripe.subscriptions.search({
      // (giftFromId is req.userId OR customerId is user.stripeCustomerId) AND status is active
        query: `metadata["giftFromId"]:"${req.userId}" AND status:"active"`,
        limit: 100
      })]);
  } catch (e) {
    logger.error(e);

    return [500, { error: 'Stripe error looking up subscriptions.' }];
  }

  const subscriptionsConcat = subscriptionsGifts.data.concat(subscriptionsNormal?.data || []);
  // dedupe based on subscription id
  const subscriptions = subscriptionsConcat.filter((subscription, index, self) =>
    index === self.findIndex((t) => (
      t.id === subscription.id
    ))
  );

  const subscriptionData: SubscriptionData[] = [];

  for (const subscription of subscriptions) {
    const plan = await stripe.plans.retrieve(subscription.items.data[0].plan.id);
    const product = await stripe.products.retrieve(plan.product as string);
    const planName = product.name;

    let paymentMethod: Stripe.PaymentMethod | null = null;

    if (subscription.default_payment_method) {
      paymentMethod = await stripe.paymentMethods.retrieve(subscription.default_payment_method as string);
    }

    // if subscription has metadata... it is a gift and we should query the gift id
    let giftToUser = undefined;

    if (subscription.metadata?.giftToId) {
      giftToUser = await UserModel.findById(subscription.metadata?.giftToId, USER_DEFAULT_PROJECTION).lean<User>();
    }

    if (giftToUser) {
      cleanUser(giftToUser);
    }

    subscriptionData.push({
      paymentMethod: paymentMethod,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: subscription.current_period_end,
      cancel_at: subscription.cancel_at,
      current_period_start: subscription.current_period_start,
      plan: plan,
      planName: planName,
      status: subscription.status,
      subscriptionId: subscription.id,
      giftToUser: giftToUser,
    });
  }

  // query payment methods on file
  const paymentMethods = !user?.stripeCustomerId ? undefined : await stripe.paymentMethods.list({
    customer: user.stripeCustomerId,
    type: 'card',
  });

  if (paymentMethods) {
    return [200, subscriptionData, paymentMethods.data];
  }

  return [200, subscriptionData];
}

// TODO: can delete this
export async function cancelSubscription(req: NextApiRequestWithAuth): Promise<[number, { error: string } | { message: string }]> {
  const userId = req.userId;
  // TODO: figure out gameId
  const user = await UserModel.findOne({ _id: userId }, { stripeCustomerId: 1 }).lean<User>();

  if (!user?.stripeCustomerId) {
    return [404, { error: 'No subscription found for this user.' }];
  }

  let subscriptions: Stripe.Response<Stripe.ApiList<Stripe.Subscription>>;

  try {
    subscriptions = await stripe.subscriptions.list({ customer: user.stripeCustomerId });
  } catch (e) {
    logger.error(e);

    return [500, { error: 'Stripe error looking up subscriptions.' }];
  }

  const subscriptionId = subscriptions.data[0]?.id;

  if (!subscriptionId) {
    return [404, { error: 'No stripe subscription found for this user.' }];
  }

  let subscriptionUpdate;

  try {
    subscriptionUpdate = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } catch (e) {
    logger.error(e);

    return [500, { error: (e as Error)?.message }];
  }

  if (!subscriptionUpdate) {
    return [500, { error: 'Unknown stripe subscription.' }];
  }

  if (subscriptionUpdate.status !== 'active' || !subscriptionUpdate.cancel_at_period_end) {
    return [500, { error: 'Subscription could not be scheduled for cancellation.' }];
  }

  return [200, { message: 'Subscription will be canceled at the end of the current billing period.' }];
}

export default withAuth({
  GET: {},
  POST: {
    body: {
      type: ValidEnum(Object.values(ProSubscriptionType), true),
      paymentMethodId: ValidType('string', true),
    }
  },
}, async (req, res) => {
  if (req.method === 'GET') {
    const [code, data, paymentMethods] = await getSubscriptions(req);

    if (code !== 200) {
      return res.status(code).json({ error: (data as { error: string })?.error });
    }

    return res.status(code).json({ subscriptions: data, paymentMethods: paymentMethods });
  } else if (req.method === 'POST') {
    const { type, paymentMethodId } = req.body as { type: ProSubscriptionType, paymentMethodId: string };

    const game = getGameFromId(req.gameId);

    if (isPro(req.user)) {
      return res.status(400).json({ error: 'You are already subscribed to ' + game.displayName + ' Pro' });
    }

    const paymentPriceIdTable = {
      [ProSubscriptionType.Monthly]: game.stripePriceIdMonthly,
      [ProSubscriptionType.Yearly]: game.stripePriceIdYearly,
    };

    try {
      const price = paymentPriceIdTable[type];

      // check if customer id exists for this req.user
      const user = await UserModel.findOne({ _id: req.user._id }, { stripeCustomerId: 1 }).lean<User>();
      const customerId = user?.stripeCustomerId;

      if (!customerId) {
        return res.status(404).json({ error: 'No subscription found for this user.' });
      }

      const customer = await stripe.customers.retrieve(customerId);

      if (!customer) {
        return res.status(404).json({ error: 'No customer found for this user.' });
      }

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [
          // quantity needs to be ONE here so we are only billed for one subscription. the cancel_at is where the length of the subscription is set
          { price: price },
        ],
        default_payment_method: paymentMethodId,
        metadata: {
          userId: req.userId,
          gameId: req.gameId,
          type: type,
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
});
