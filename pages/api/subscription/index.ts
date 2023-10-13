import { logger } from '@root/helpers/logger';
import cleanUser from '@root/lib/cleanUser';
import User from '@root/models/db/user';
import { USER_DEFAULT_PROJECTION } from '@root/models/schemas/userSchema';
import Stripe from 'stripe';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { UserConfigModel, UserModel } from '../../../models/mongoose';

const STRIPE_SECRET = process.env.STRIPE_SECRET as string;

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;
export const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2022-11-15' });

export interface SubscriptionData {
  cancel_at: number | null;
  cancel_at_period_end: boolean;
  current_period_end: number;
  current_period_start: number;
  giftToUser?: User;
  paymentMethod: Stripe.PaymentMethod;
  plan: Stripe.Plan;
  planName: string;
  status: Stripe.Subscription.Status;
  subscriptionId: string;
}

export async function getSubscriptions(req: NextApiRequestWithAuth): Promise<[number, { error: string } | SubscriptionData[]]> {
  const userId = req.userId;
  const userConfig = await UserConfigModel.findOne({ userId: userId }, { stripeCustomerId: 1 }, { lean: true });

  let subscriptionsNormal: Stripe.Response<Stripe.ApiList<Stripe.Subscription>> | undefined;
  let subscriptionsGifts: Stripe.Response<Stripe.ApiSearchResult<Stripe.Subscription>>;

  try {
    [subscriptionsNormal, subscriptionsGifts] = await Promise.all([
      userConfig?.stripeCustomerId ? stripe.subscriptions.list({ customer: userConfig.stripeCustomerId }) : undefined,
      stripe.subscriptions.search({
      // (giftFromId is req.userId OR customerId is userConfig.stripeCustomerId) AND status is active
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

    const paymentMethod = await stripe.paymentMethods.retrieve(subscription.default_payment_method as string);

    // if subscription has metadata... it is a gift and we should query the gift id
    let giftToUser = undefined;

    if (subscription.metadata?.giftToId) {
      giftToUser = await UserModel.findById(subscription.metadata?.giftToId, USER_DEFAULT_PROJECTION, { lean: true });
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

  return [200, subscriptionData];
}

// TODO: can delete this
export async function cancelSubscription(req: NextApiRequestWithAuth): Promise<[number, { error: string } | { message: string }]> {
  const userId = req.userId;
  const userConfig = await UserConfigModel.findOne({ userId: userId }, { stripeCustomerId: 1 }, { lean: true });

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
  if (req.method === 'GET') {
    const [code, data] = await getSubscriptions(req);

    return res.status(code).json(data);
  }
});
