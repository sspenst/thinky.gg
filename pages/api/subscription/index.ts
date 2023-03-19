import Stripe from 'stripe';
import withAuth from '../../../lib/withAuth';
import { UserConfigModel } from '../../../models/mongoose';

const STRIPE_SECRET = process.env.STRIPE_SECRET as string;

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;
export const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2022-11-15' });
export default withAuth({
  DELETE: {}
}, async (req, res) => {
  // get the customer ID from their config
  const userId = req.userId;
  const userConfig = await UserConfigModel.findOne({ userId: userId }, { customerId: 1 });

  // get the list of subscriptions for the customer
  const subscriptions = await stripe.subscriptions.list({ customer: userConfig.customerId });

  // get the subscription ID from the customer's subscriptions
  const subscriptionId = subscriptions.data[0]?.id;

  if (!subscriptionId) {
    // Handle the case when there's no subscription found
    res.status(400).json({ error: 'No subscription found for this user.' });

    return;
  }

  // cancel the subscription at the end of the current billing period
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  if (subscription.status !== 'active' || !subscription.cancel_at_period_end) {
    // Handle the case when the subscription is not set to cancel at period end
    res.status(400).json({ error: 'Subscription could not be scheduled for cancellation.' });
  }

  res.status(200).json({ message: 'Subscription will be canceled at the end of the current billing period.' });
});
