/* eslint-disable no-case-declarations */
import { buffer } from 'micro';
import { ObjectId } from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import Role from '../../../constants/role';
import apiWrapper from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import User from '../../../models/db/user';
import UserConfig from '../../../models/db/userConfig';
import { StripeEventModel, UserConfigModel, UserModel } from '../../../models/mongoose';

const STRIPE_SECRET = process.env.STRIPE_SECRET as string;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;
const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2022-11-15' });

export const config = {
  api: {
    bodyParser: false,
  },
};

async function subscriptionDeleted(userToDowngrade: User) {
  // we want to downgrade the user
  try {
    await Promise.all([UserModel.findOneAndUpdate(
      {
        _id: userToDowngrade._id
      },
      {
      // pull
        $pull: {
          role: Role.PRO_SUBSCRIBER
        }
      }
    ), UserConfigModel.findOneAndUpdate(
      {
        userId: userToDowngrade._id
      },
      {
        stripeCustomerId: null
      }
    )]);
  } catch (err) {
    logger.error(err);

    return err;
  }
}

async function checkoutSessionComplete(userToUpgrade: User, properties: Stripe.Checkout.Session) {
  const customerId = properties.customer;

  // otherwise... let's upgrade the user?
  let error;

  // if the user is already a pro subscriber, we don't want to do anything
  if (userToUpgrade?.roles.includes(Role.PRO_SUBSCRIBER)) {
    // we want to log the error
    error = `User with id ${userToUpgrade._id} is already a pro subscriber`;
  }

  // otherwise... let's upgrade the user?
  if (!error) {
    // we want to upgrade the user

    await Promise.all([UserModel.findOneAndUpdate(
      {
        _id: userToUpgrade._id
      },
      {
        // add to set
        $addToSet: {
          role: Role.PRO_SUBSCRIBER
        }
      }
    ), UserConfigModel.findOneAndUpdate(
      {
        userId: userToUpgrade._id
      },
      {
        stripeCustomerId: customerId
      }
    )]);
  }

  return error;
}

export default apiWrapper({
  POST: {

  } }, async (req: NextApiRequest, res: NextApiResponse) => {
  const sig = req.headers['stripe-signature'] as string;

  let event;
  const buf = await buffer(req);

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.log(`Error: ${err.message}`);

    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  logger.info('Stripe webhook event:', event.type);
  //console.log('Event properties:', event.data.object);

  // Handle the event
  let error, actorUser;

  const properties = event.data.object as any;
  const customerId = properties?.customer;

  const subscriptionId = properties?.subscription;
  // we want to get the customer id from the event
  // we want to get the customer email from the event
  const customerEmail = properties?.email;

  const client_reference_id = properties?.client_reference_id;

  logger.info('subscriptionId:', subscriptionId);
  logger.info('customerId:', customerId);
  logger.info('customerEmail:', customerEmail);
  logger.info('client_reference_id:', client_reference_id);
  // we want to get the user id from the event

  // grab the user from the database
  let userTarget;

  if (client_reference_id) { // will only exist for checkout.session.completed
    userTarget = await UserModel.findById(client_reference_id);
  } else {
    const userConfig = await UserConfigModel.findOne({
      stripeCustomerId: customerId
    });

    userTarget = userConfig.userId;
  }

  switch (event.type) {
  // the case we want to handle first is the one that will be triggered when a new subscription is created
  case 'checkout.session.completed':
    // we want to get the subscription id from the event
    if (!userTarget) {
      // we want to log the error
      error = `User with id ${userTarget} does not exist`;
      break;
    }

    error = await checkoutSessionComplete(userTarget, event.data.object as Stripe.Checkout.Session);

    break;
    // handle canceling a subscription
  case 'customer.subscription.deleted':
    // we want to get the subscription id from the event
    if (!userTarget) {
      // we want to log the error
      error = `User with id ${userTarget} does not exist`;
      break;
    }

    error = await subscriptionDeleted(userTarget);
    break;

    // handle failed payments
  case 'invoice.payment_failed':
    // we want to get the subscription id from the event
    if (!userTarget) {
      // we want to log the error
      error = `User with id ${userTarget} does not exist`;
      break;
    }

    error = await subscriptionDeleted(userTarget);
    break;

  default:

    console.log(`Unhandled event type: ${event.type}`);
  }

  await StripeEventModel.create({
    stripeId: event.id,
    userId: actorUser,
    type: event.type,
    created: event.created,
    data: event.object,
    error: error
  });
  // Return a 200 response to acknowledge receipt of the event
  res.status(200).json({ received: true });
}
);
