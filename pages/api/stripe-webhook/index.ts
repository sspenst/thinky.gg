import { buffer } from 'micro';
import mongoose from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import Role from '../../../constants/role';
import apiWrapper from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import User from '../../../models/db/user';
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
          roles: Role.PRO_SUBSCRIBER
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
  if (userToUpgrade?.roles?.includes(Role.PRO_SUBSCRIBER)) {
    // we want to log the error
    error = `User with id ${userToUpgrade._id} is already a pro subscriber`;
  }

  // otherwise... let's upgrade the user?
  if (!error) {
    // we want to upgrade the user
    const transaction = await mongoose.startSession();

    await transaction.withTransaction(async () => {
      await Promise.all([UserModel.findByIdAndUpdate(
        userToUpgrade._id,
        {
          // add to set
          $addToSet: {
            roles: Role.PRO_SUBSCRIBER
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
    });
  }

  return error;
}

//create a small class with createStripeSigned as a member function makes it easier to mock
export class StripeWebhookHelper {
  public static async createStripeSigned(req: NextApiRequest) {
    const sig = req.headers['stripe-signature'] as string;

    const buf = await buffer(req);

    const event = stripe.webhooks.constructEvent(
      buf,
      sig,
      STRIPE_WEBHOOK_SECRET
    );

    return event;
  }
}

export default apiWrapper({
  POST: {
  } }, async (req: NextApiRequest, res: NextApiResponse) => {
  let event;

  try {
    event = await StripeWebhookHelper.createStripeSigned(req);
  } catch (err: any) {
    logger.error(`Error: ${err.message}`);

    return res.status(400).json({ error: `Webhook error: ${err.message}` });
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

  logger.info('subscriptionId:' + subscriptionId);
  logger.info('customerId:' + customerId);
  logger.info('customerEmail:' + customerEmail);
  logger.info('client_reference_id:' + client_reference_id);
  // we want to get the user id from the event

  // grab the user from the database

  if (!event.type) {
    return res.status(400).json({ error: 'No event type' });
  }

  // the case we want to handle first is the one that will be triggered when a new subscription is created
  if (event.type === 'checkout.session.completed') {
    // we want to get the subscription id from the event
    if (!client_reference_id || !mongoose.Types.ObjectId.isValid(client_reference_id)) {
      error = 'No client reference id (or is not valid object id)';
    } else {
      const userTarget = await UserModel.findById(client_reference_id);

      if (!userTarget) {
      // we want to log the error
        error = `User with id ${userTarget} does not exist`;
      } else {
        error = await checkoutSessionComplete(userTarget, event.data.object as Stripe.Checkout.Session);
      }
    }
  } else if (event.type === 'customer.subscription.deleted') {
    const userConfig = await UserConfigModel.findOne({
      stripeCustomerId: customerId
    });

    const userTarget = userConfig.userId;

    if (!userTarget) {
      // we want to log the error
      error = `User with id ${userTarget} does not exist`;
    } else {
      error = await subscriptionDeleted(userTarget);
    }
  }
  // handle failed payments
  else if (event.type === 'invoice.payment_failed') {
    const userConfig = await UserConfigModel.findOne({
      stripeCustomerId: customerId
    });
    const userTarget = userConfig.userId;

    // we want to get the subscription id from the event
    if (!userTarget) {
      // we want to log the error
      error = `User with id ${userTarget} does not exist`;
    }

    error = await subscriptionDeleted(userTarget);
  } else {
    logger.error(`Unhandled event type: ${event.type}`);
  }

  await StripeEventModel.create({
    stripeId: event.id,
    customerId: customerId,
    userId: actorUser,
    type: event.type,
    created: event.created,
    data: event.object,
    error: error
  });

  // Return a 200 response to acknowledge receipt of the event
  if (error) {
    return res.status(400).json({ error: error });
  }

  res.status(200).json({ received: true });
}
);
