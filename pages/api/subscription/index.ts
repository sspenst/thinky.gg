import { logger } from '@root/helpers/logger';
import Stripe from 'stripe';
import withAuth from '../../../lib/withAuth';
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

export default withAuth({
  GET: {},
  DELETE: {}
}, async (req, res) => {
  if (req.method === 'GET') {
    // get the customer ID from their config
    const userId = req.user._id;
    const userConfig = await UserConfigModel.findOne({ userId: userId }, { stripeCustomerId: 1 });

    if (!userConfig.stripeCustomerId) {
      return res.status(404).json({ error: 'No subscription found for this user.' });
    }

    // get the list of subscriptions for the customer
    let subscription;

    try {
      const subscriptions = await stripe.subscriptions.list({ customer: userConfig.stripeCustomerId });

      // get the subscription from the customer's subscriptions
      subscription = subscriptions?.data[0];
    } catch (e) {
      logger.error(e);

      return res.status(500).json({ error: 'Stripe error looking up subscriptions.' });
    }

    if (!subscription) {
      // Handle the case when there's no subscription found
      return res.status(404).json({ error: 'Unknown stripe subscription.' });
    }

    return res.status(200).json({
      subscriptionId: subscription.id,
      plan: subscription.items?.data[0].plan,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      status: subscription.status,
    } as SubscriptionData);
  } else if (req.method === 'DELETE' ) {
  // get the customer ID from their config
    const userId = req.userId;
    const userConfig = await UserConfigModel.findOne({ userId: userId }, { stripeCustomerId: 1 });

    // get the list of subscriptions for the customer
    let subscriptionId;

    try {
      const subscriptions = await stripe.subscriptions.list({ customer: userConfig.stripeCustomerId });

      // get the subscription ID from the customer's subscriptions
      subscriptionId = subscriptions.data[0]?.id;
    } catch (e) {
      logger.error(e);

      return res.status(500).json({ error: 'Stripe error looking up subscriptions.' });
    }

    if (!subscriptionId) {
    // Handle the case when there's no subscription found
      return res.status(404).json({ error: 'No subscription found for this user.' });
    }

    // cancel the subscription at the end of the current billing period
    let subscription;

    try {
      const subscriptionUpdate = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      subscription = subscriptionUpdate;
    } catch (e) {
      logger.error(e);

      return res.status(500).json({ error: 'Stripe error canceling subscription.' });
    }

    if (!subscription) {
    // Handle the case when the subscription is not found
      logger.error('Subscription not found on user when unsubscribing.');

      return res.status(500).json({ error: 'Unknown stripe subscription.' });
    }

    if (subscription.status !== 'active' || !subscription.cancel_at_period_end) {
      return res.status(400).json({ error: 'Subscription could not be scheduled for cancellation.' });
    }

    res.status(200).json({ message: 'Subscription will be canceled at the end of the current billing period.' });
  }
});
