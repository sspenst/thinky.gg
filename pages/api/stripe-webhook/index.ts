import Discord from '@root/constants/discord';
import { GameId } from '@root/constants/GameId';
import queueDiscordWebhook from '@root/helpers/discordWebhook';
import isPro from '@root/helpers/isPro';
import { createNewProUserNotification } from '@root/helpers/notificationHelper';
import dbConnect from '@root/lib/dbConnect';
import UserConfig from '@root/models/db/userConfig';
import { buffer } from 'micro';
import mongoose, { Types } from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import Role from '../../../constants/role';
import apiWrapper from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import User from '../../../models/db/user';
import { StripeEventModel, UserConfigModel, UserModel } from '../../../models/mongoose';
import { stripe, STRIPE_WEBHOOK_SECRET } from '../subscription';
import { GiftType } from '../subscription/gift';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function subscriptionDeleted(userToDowngrade: User, subscription: Stripe.Subscription): Promise<string | undefined> {
  logger.info(`subscriptionDeleted - ${userToDowngrade.name} (${userToDowngrade._id.toString()})`);

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const promises = [
        // NB: gift recipients do not have a stripe customer id
        UserConfigModel.findOneAndUpdate(
          {
            userId: userToDowngrade._id,
            // TODO: Get GameId
          },
          {
            stripeCustomerId: null,
            $pull: {
              roles: Role.PRO
            }
          },
          {
            session: session
          },
        ),
        queueDiscordWebhook(Discord.DevPriv, `🥹 [${userToDowngrade.name}](https://thinky.gg/profile/${userToDowngrade.name}) was just unsubscribed.`),
      ];

      // NB: metadata should normally be defined but it isn't mocked in the tests
      const giftFromId = subscription.metadata?.giftFromId;

      if (giftFromId) {
        // pull the gift subscription id if it was gifted
        promises.push(
          UserConfigModel.findOneAndUpdate(
            {
              userId: new Types.ObjectId(giftFromId),
              // TODO: Get GameId
            },
            {
              $pull: {
                giftSubscriptions: subscription.id,
              },
            },
            {
              session: session
            },
          )
        );
      }

      await Promise.all(promises);
    });
    session.endSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    logger.error(err);
    session.endSession();

    return err?.message;
  }
}

async function checkoutSessionGift(giftFromUser: User, giftToUser: User, subscription: Stripe.Subscription): Promise<string | undefined> {
  let error: string | undefined;
  const giftToUserConfig = await UserConfigModel.findOne({ userId: giftToUser._id });

  if (isPro(giftToUserConfig)) {
    // TODO: create a coupon and apply it to the existing subscription..
    // https://stripe.com/docs/api/coupons/create

    error = `${giftFromUser.name} is already a pro subscriber. Error applying gift. Please contact support.`;
  }

  // Extract product name from properties, if available
  let productName = 'unknown';

  // Fetch line items for the session
  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(subscription.id);

    if (lineItems.data.length > 0) {
      // Assuming the first line item represents the product purchased
      const productId = lineItems.data[0].price?.product;

      if (productId) {
        const product = await stripe.products.retrieve(productId as string);

        productName = product.name;
      } else {
        logger.error('Error fetching product details: no product id');
      }
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    logger.error(`Error fetching product details: ${err.message}`);
  }

  logger.info(`Product name purchasing: ${productName}`);

  let gameId: GameId = GameId.THINKY;

  // TODO: test this
  if (productName.match(/pathology/i)) {
    gameId = GameId.PATHOLOGY;
  } else if (productName.match(/sokoban/i)) {
    gameId = GameId.SOKOBAN;
  }

  if (!error) {
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const quantity = Number(subscription.metadata?.quantity) ?? 0;
        const type = subscription.metadata?.type as GiftType;

        await Promise.all([
          UserConfigModel.findOneAndUpdate(
            {
              userId: giftToUser._id,
              gameId: gameId,
              // TODO: Get GameId
            },
            {
              // add to set gift subscriptions
              $addToSet: {
                roles: Role.PRO
              },
            },
            {
              session: session
            },
          ),
          UserConfigModel.findOneAndUpdate(
            {
              userId: giftFromUser._id,
              gameId: gameId,
              // TODO: Get GameId
            },
            {
              // add to set gift subscriptions
              $addToSet: {
                giftSubscriptions: subscription.id,
              },
            },
            {
              session: session
            },
          ),
          // TODO: Figure a way to get the game ID from the subscription object since each game should be different, but for now this is fine
          createNewProUserNotification(gameId, giftToUser._id, giftFromUser._id),
          queueDiscordWebhook(Discord.DevPriv, `💸 [${giftFromUser.name}](https://thinky.gg/profile/${giftFromUser.name}) just gifted ${quantity} ${type === GiftType.Yearly ? 'year' : 'month'}${quantity === 1 ? '' : 's'} of Pro to [${giftToUser.name}](https://thinky.gg/profile/${giftToUser.name})`)
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

async function checkoutSessionComplete(userToUpgrade: User, properties: Stripe.Checkout.Session): Promise<string | undefined> {
  logger.info(`checkoutSessionComplete - ${userToUpgrade.name} (${userToUpgrade._id.toString()})`);

  // Extract product name from properties, if available
  let productName = 'unknown';

  // Fetch line items for the session
  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(properties.id);

    if (lineItems.data.length > 0) {
      // Assuming the first line item represents the product purchased
      const productId = lineItems.data[0].price?.product;

      if (productId) {
        const product = await stripe.products.retrieve(productId as string);

        productName = product.name;
      } else {
        logger.error('Error fetching product details: no product id');
      }
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    logger.error(`Error fetching product details: ${err.message}`);
  }

  logger.info(`Product name purchasing: ${productName}`);

  let gameId: GameId = GameId.THINKY;

  if (productName.match(/pathology/i)) {
    gameId = GameId.PATHOLOGY;
  } else if (productName.match(/sokoban/i)) {
    gameId = GameId.SOKOBAN;
  }

  const customerId = properties.customer;

  let error: string | undefined;

  // if the user is already a pro subscriber, we don't want to do anything
  const userToUpgradeConfig = await UserConfigModel.findOne({ userId: userToUpgrade._id });

  if (isPro(userToUpgradeConfig)) {
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
          UserConfigModel.findOneAndUpdate(
            {
              userId: userToUpgrade._id,
              gameId: gameId,
              // TODO: Get GameId
            },
            {
              stripeCustomerId: customerId,
              $addToSet: {
                roles: Role.PRO
              }
            },
            {
              session: session,
              new: true,
            },
          ),
          createNewProUserNotification(gameId, userToUpgrade._id),
          queueDiscordWebhook(Discord.DevPriv, `💸 [${userToUpgrade.name}](https://thinky.gg/profile/${userToUpgrade.name}) just subscribed to ${productName}!`),
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

async function splitPaymentIntent(paymentIntentId: string): Promise<string | undefined> {
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

  // https://stripe.com/docs/connect/separate-charges-and-transfers#transfer-availability
  await stripe.transfers.create({
    amount: split,
    currency: 'usd',
    source_transaction: charge.id,
    destination: process.env.STRIPE_CONNECTED_ACCOUNT_ID as string,
  });

  logger.info(`splitPaymentIntent transferred ${split} from ${paymentIntentId}`);
}

//create a small class with createStripeSigned as a member function makes it easier to mock
/* istanbul ignore next 
// Newline placeholder needed for swc: https://github.com/swc-project/jest/issues/119#issuecomment-1872581999
*/
export class StripeWebhookHelper {
  public static async createStripeSigned(req: NextApiRequest) {
    const sig = req.headers['stripe-signature'] as string;
    const buf = await buffer(req);

    return stripe.webhooks.constructEvent(buf, sig, STRIPE_WEBHOOK_SECRET);
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

  // the case we want to handle first is the one that will be triggered when a new subscription is created
  if (event.type === 'checkout.session.completed') {
    logger.info('checkout.session.completed starts');
    logger.info(`customerId: ${customerId}`);
    logger.info(`client_reference_id: ${client_reference_id}`);

    const metadata = dataObject?.metadata;

    logger.info(`metadata: ${JSON.stringify(metadata)}`);

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

        if (!error) {
          // cancel any gift subscriptions for this user

          const subscriptions = await stripe.subscriptions.search({
            query: `metadata["giftFromId"]:"${userTarget._id.toString()}"`,
            limit: 100
          });

          // cancel all these subscriptions
          if (subscriptions && subscriptions.data) {
            for (const subscription of subscriptions.data) {
              await stripe.subscriptions.update(subscription.id, {
                cancel_at_period_end: true,
              });
            }
          }
          // TODO: hypothetically i guess there could be a race condition where someone gifts someone right when they subscribe themselves... but for now let's just ignore that...
        }
      }
    }
  } else if (event.type === 'customer.subscription.deleted') {
    const subscription = dataObject as Stripe.Subscription;

    if (subscription.metadata?.giftToId) {
      // this is a gift subscription
      const giftToUser = await UserModel.findById(subscription.metadata.giftToId);

      if (giftToUser) {
        error = await subscriptionDeleted(giftToUser, subscription);
      } else {
        error = `giftToUser with id ${subscription.metadata.giftToId} does not exist`;
      }
    } else if (!customerId) {
      error = 'No customerId';
    } else {
      const userConfigAgg = await UserConfigModel.aggregate<UserConfig>([
        {
          $match: { stripeCustomerId: customerId },
          // TODO: Get GameId
        },
        {
          $lookup: {
            from: UserModel.collection.name,
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
        // there must be a matching userconfig in this case, so we need to return an error here
        error = `UserConfig with customer id ${customerId} does not exist`;
      } else {
        // we need to check if this is a gift subscription so we can downgrade the appropriate user
        // looks like a regular downgrade subscription of pro
        error = await subscriptionDeleted(userConfigAgg[0].userId as User, subscription);
      }
    }
  } else if (event.type === 'customer.subscription.created') {
    // get metadata for the subscription
    const subscription = dataObject as Stripe.Subscription;
    const metadata = subscription.metadata;

    if (metadata.giftToId) {
      // this is a gift subscription
      const [giftFromUser, giftToUser] = await Promise.all([
        UserModel.findById(metadata.giftFromId),
        UserModel.findById(metadata.giftToId),
      ]);

      error = await checkoutSessionGift(
        giftFromUser,
        giftToUser,
        subscription
      );
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
