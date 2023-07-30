import { logger } from '@root/helpers/logger';
import Stripe from 'stripe';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { UserConfigModel } from '../../../models/mongoose';

const STRIPE_SECRET = process.env.STRIPE_SECRET as string;

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;
export const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2022-11-15' });

export interface SubscriptionData {
  cancel_at_period_end: boolean;
  current_period_end: number;
  current_period_start: number;
  plan: Stripe.Plan;
  status: Stripe.Subscription.Status;
  subscriptionId: string;
}

export async function getSubscription(req: NextApiRequestWithAuth): Promise<[number, { error: string } | SubscriptionData]> {
  const userId = req.userId;
  const userConfig = await UserConfigModel.findOne({ userId: userId }, { stripeCustomerId: 1 });

  if (!userConfig?.stripeCustomerId) {
    return [404, { error: 'No subscription found for this user.' }];
  }

  let subscriptions: Stripe.Response<Stripe.ApiList<Stripe.Subscription>>;

  try {
    subscriptions = await stripe.subscriptions.list({ customer: userConfig.stripeCustomerId });
  } catch (e) {
    logger.error(e);

    return [500, { error: 'Stripe error looking up subscriptions.' }];
  }

  const subscription = subscriptions?.data[0];

  if (!subscription) {
    return [404, { error: 'Unknown stripe subscription.' }];
  }

  return [200, {
    cancel_at_period_end: subscription.cancel_at_period_end,
    current_period_end: subscription.current_period_end,
    current_period_start: subscription.current_period_start,
    plan: subscription.items.data[0].plan,
    status: subscription.status,
    subscriptionId: subscription.id,
  }];
}

// TODO: can delete this
export async function cancelSubscription(req: NextApiRequestWithAuth): Promise<[number, { error: string } | { message: string }]> {
  const userId = req.userId;
  const userConfig = await UserConfigModel.findOne({ userId: userId }, { stripeCustomerId: 1 });

  if (!userConfig?.stripeCustomerId) {
    return [404, { error: 'No subscription found for this user.' }];
  }

  let subscriptions: Stripe.Response<Stripe.ApiList<Stripe.Subscription>>;

  try {
    subscriptions = await stripe.subscriptions.list({ customer: userConfig.stripeCustomerId });
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
}, async (req, res) => {
  const [code, data] = await getSubscription(req);

  return res.status(code).json(data);
});
