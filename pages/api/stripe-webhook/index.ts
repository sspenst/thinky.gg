import Discord from '@root/constants/discord';
import queueDiscordWebhook from '@root/helpers/discordWebhook';
import isPro from '@root/helpers/isPro';
import dbConnect from '@root/lib/dbConnect';
import UserConfig from '@root/models/db/userConfig';
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
  logger.info(`subscriptionDeleted - ${userToDowngrade.name} (${userToDowngrade._id.toString()})`);

  // we want to downgrade the user
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await Promise.all([
        UserModel.findOneAndUpdate(
          {
            _id: userToDowngrade._id
          },
          {
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
        ),
        queueDiscordWebhook(Discord.DevPriv, `🥹 [${userToDowngrade.name}](https://pathology.gg/profile/${userToDowngrade.name}) just unsubscribed.`),
      ]);
      session.endSession();
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    logger.error(err);

    session.endSession();

    return err.message;
  }
}

async function checkoutSessionComplete(userToUpgrade: User, properties: Stripe.Checkout.Session) {
  logger.info(`checkoutSessionComplete - ${userToUpgrade.name} (${userToUpgrade._id.toString()})`);

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
        await Promise.all([
          UserModel.findByIdAndUpdate(
            userToUpgrade._id,
            {
              $addToSet: {
                roles: Role.PRO
              }
            },
            {
              session: session
            }
          ),
          UserConfigModel.findOneAndUpdate(
            {
              userId: userToUpgrade._id
            },
            {
              stripeCustomerId: customerId
            },
            {
              session: session
            }
          ),
          queueDiscordWebhook(Discord.DevPriv, `💸 [${userToUpgrade.name}](https://pathology.gg/profile/${userToUpgrade.name}) just subscribed!`),
        ]);
      });
      session.endSession();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      logger.error(err);
      session.endSession();
      error = err?.message;
    }
  }

  return error;
}

async function splitPaymentIntent(paymentIntentId: string) {
  if (!process.env.STRIPE_CONNECTED_ACCOUNT_ID) {
    return `splitPaymentIntent(${paymentIntentId}): missing STRIPE_CONNECTED_ACCOUNT_ID`;
  }

  // https://stripe.com/docs/expand/use-cases#stripe-fee-for-payment
  const paymentIntent = await stripe.paymentIntents.retrieve(
    paymentIntentId,
    {
      expand: ['latest_charge.balance_transaction'],
    }
  );

  const charge = paymentIntent.latest_charge as Stripe.Charge | null | undefined;

  if (!charge) {
    return `splitPaymentIntent(${paymentIntentId}): missing latest_charge`;
  }

  const balanceTransaction = charge.balance_transaction as Stripe.BalanceTransaction | null | undefined;
  const stripeFee = balanceTransaction?.fee;

  if (stripeFee === undefined) {
    return `splitPaymentIntent(${paymentIntentId}): missing balance_transaction.fee`;
  }

  const net = paymentIntent.amount - stripeFee;
  const split = Math.round(net / 2);

  await stripe.transfers.create({
    amount: split,
    currency: 'usd',
    source_transaction: charge.id,
    destination: process.env.STRIPE_CONNECTED_ACCOUNT_ID,
  });

  logger.info(`splitPaymentIntent transferred ${split} from ${paymentIntentId}`);
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
  POST: {},
}, async (req: NextApiRequest, res: NextApiResponse) => {
  await dbConnect();

  let event: Stripe.Event;

  try {
    event = await StripeWebhookHelper.createStripeSigned(req);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    logger.error(`Error: ${err.message}`);

    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  logger.info(`Stripe webhook event: ${event.type}`);

  // Handle the event
  let error, actorUser;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataObject = event.data.object as any;
  const customerId = dataObject?.customer;
  const client_reference_id = dataObject?.client_reference_id;

  logger.info(`customerId: ${customerId}`);
  logger.info(`client_reference_id: ${client_reference_id}`);

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
      const userConfigAgg = await UserConfigModel.aggregate<UserConfig>([
        {
          $match: { stripeCustomerId: customerId },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userId',
          },
        },
        {
          $unwind: '$userId',
        }
      ]);

      if (userConfigAgg.length === 0) {
        error = `UserConfig with customer id ${customerId} does not exist`;
      } else {
        error = await subscriptionDeleted(userConfigAgg[0].userId as User);
      }
    }
  } else if (event.type === 'payment_intent.succeeded') {
    error = await splitPaymentIntent(dataObject.id);
  } else {
    logger.info(`Unhandled event type: ${event.type}`);
  }

  await StripeEventModel.create({
    created: event.created,
    customerId: customerId,
    data: JSON.stringify(event),
    error: error,
    stripeId: event.id,
    type: event.type,
    userId: actorUser,
  });

  // Return a 200 response to acknowledge receipt of the event
  if (error) {
    logger.error(`api/stripe-webhook error: ${error}`);

    return res.status(400).json({ error: error });
  }

  res.status(200).json({ received: true });
});
