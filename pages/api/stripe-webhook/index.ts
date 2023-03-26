import isPro from '@root/helpers/isPro';
import { buffer } from 'micro';
import mongoose from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import Role from '../../../constants/role';
import apiWrapper from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import User from '../../../models/db/user';
import { StripeEventModel, UserConfigModel, UserModel } from '../../../models/mongoose';
import { stripe, STRIPE_WEBHOOK_SECRET } from '../subscription';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function subscriptionDeleted(userToDowngrade: User) {
  // we want to downgrade the user
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await Promise.all([UserModel.findOneAndUpdate(
        {
          _id: userToDowngrade._id
        },
        {
          // pull
          $pull: {
            roles: Role.PRO
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
      session.endSession();
    });
  } catch (err: any) {
    logger.error(err);

    session.endSession();

    return err.message;
  }
}

async function checkoutSessionComplete(userToUpgrade: User, properties: Stripe.Checkout.Session) {
  const customerId = properties.customer;

  // otherwise... let's upgrade the user?
  let error;

  // if the user is already a pro subscriber, we don't want to do anything
  if (isPro(userToUpgrade)) {
    // we want to log the error
    error = `User with id ${userToUpgrade._id} is already a pro subscriber`;
  }

  // otherwise... let's upgrade the user?
  if (!error) {
    // we want to upgrade the user
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await Promise.all([UserModel.findByIdAndUpdate(
          userToUpgrade._id,
          {
          // add to set
            $addToSet: {
              roles: Role.PRO
            }
          },
          {
            session: session
          }
        ), UserConfigModel.findOneAndUpdate(
          {
            userId: userToUpgrade._id
          },
          {
            stripeCustomerId: customerId
          },
          {
            session: session
          }
        )]);
      });
      session.endSession();
    } catch (err: any) {
      logger.error(err);
      session.endSession();
      error = err?.message;
    }
  }

  return error;
}

//create a small class with createStripeSigned as a member function makes it easier to mock
/* istanbul ignore next */
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
        error = `User with id ${client_reference_id} does not exist`;
      } else {
        error = await checkoutSessionComplete(userTarget, event.data.object as Stripe.Checkout.Session);
      }
    }
  } else if (event.type === 'customer.subscription.deleted' || event.type === 'invoice.payment_failed') {
    if (!customerId) {
      error = 'No customerId';
    } else {
      const userConfig = await UserConfigModel.findOne({
        stripeCustomerId: customerId
      });

      const userTarget = userConfig?.userId;

      if (!userTarget) {
      // we want to log the error
        error = `User with customer id ${customerId} does not exist`;
      } else {
        error = await subscriptionDeleted(userTarget);
      }
    }
  } else {
    logger.error(`Unhandled event type: ${event.type}`);
    // error = `Unhandled event type: ${event.type}`;
  }

  await StripeEventModel.create({
    stripeId: event.id,
    customerId: customerId,
    userId: actorUser,
    type: event.type,
    created: event.created,
    data: JSON.stringify(event),
    error: error
  });

  // Return a 200 response to acknowledge receipt of the event
  if (error) {
    return res.status(400).json({ error: error });
  }

  res.status(200).json({ received: true });
}
);
