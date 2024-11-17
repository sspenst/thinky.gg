import DiscordChannel from '@root/constants/discordChannel';
import { GameId } from '@root/constants/GameId';
import queueDiscordWebhook from '@root/helpers/discordWebhook';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import isPro from '@root/helpers/isPro';
import { createNewProUserNotification } from '@root/helpers/notificationHelper';
import dbConnect from '@root/lib/dbConnect';
import KeyValue from '@root/models/db/keyValue';
import { buffer } from 'micro';
import mongoose, { ClientSession, Types } from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import Role from '../../../constants/role';
import apiWrapper from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import User from '../../../models/db/user';
import { KeyValueModel, StripeEventModel, UserConfigModel, UserModel } from '../../../models/mongoose';
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

  const { gameId, productName } = await getGameFromSubscription(subscription);

  try {
    await session.withTransaction(async () => {
      const promises = [
        UserConfigModel.findOneAndUpdate(
          {
            userId: userToDowngrade._id,
            gameId: gameId,
          },
          {
            $pull: {
              roles: Role.PRO
            }
          },
          {
            session: session
          },
        ),
        queueDiscordWebhook(DiscordChannel.DevPriv, `🥹 UNSUBSCRIBED. [${userToDowngrade.name}](https://thinky.gg/profile/${userToDowngrade.name}) was just unsubscribed from ` + productName),
      ];

      // if the game is thinky, then we should findOneAndUpdate the other game configs too
      if (gameId === GameId.THINKY) {
        await downgradeAccessToAllGames(userToDowngrade._id, session);
      }

      // NB: metadata should normally be defined but it isn't mocked in the tests
      const giftFromId = subscription.metadata?.giftFromId;

      if (giftFromId) {
        // pull the gift subscription id if it was gifted
        promises.push(
          UserModel.findOneAndUpdate(
            {
              userId: new Types.ObjectId(giftFromId),
            },
            {
              $pull: {
                stripeGiftSubscriptions: subscription.id,
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

function getGameIdFromProductName(productName: string): GameId {
  let gameId: GameId = GameId.THINKY;

  if (productName.match(/pathology/i)) {
    gameId = GameId.PATHOLOGY;
  } else if (productName.match(/soko/i)) {
    gameId = GameId.SOKOPATH;
  } else if (productName.match(/thinky/i)) {
    gameId = GameId.THINKY;
  }

  return gameId;
}

async function getGameFromSubscription(subscription: Stripe.Subscription): Promise<{ gameId: GameId, productName: string }> {
  let productName = 'unknown';

  try {
    // Check if subscription items exist
    if (subscription.items.data.length > 0) {
      // Assuming the first item represents the main product
      const productId = subscription.items.data[0].price?.product;
      if (productId) {
        // Retrieve the product details

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

  const gameId: GameId = getGameIdFromProductName(productName);

  return { gameId: gameId, productName: productName };
}

async function getGameFromSession(session: Stripe.Checkout.Session): Promise<{ gameId: GameId, productName: string }> {
  // Extract product name from properties, if available
  let productName = 'unknown';
  
  // Fetch line items for the session
  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    
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

  logger.info(`Product name dealing with: ${productName}`);

  const gameId: GameId = getGameIdFromProductName(productName);

  return { gameId: gameId, productName: productName };
}

async function checkoutSessionGift(giftFromUser: User, giftToUser: User, subscription: Stripe.Subscription): Promise<string | undefined> {
  let error: string | undefined;

  // get product name from subscription
  const { gameId } = await getGameFromSubscription(subscription);
  const giftToUserConfig = await UserConfigModel.findOne({ userId: giftToUser._id, gameId: gameId });

  if (isPro(giftToUserConfig)) {
    // TODO: create a coupon and apply it to the existing subscription..
    // https://stripe.com/docs/api/coupons/create

    error = `${giftFromUser.name} is already a pro subscriber for this game. Error applying gift. Please contact support.`;
  }

  // Extract product name from properties, if available

  if (!error) {
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const quantity = Number(subscription.metadata?.quantity) ?? 0;
        const type = subscription.metadata?.type as GiftType;

        await Promise.all([
          UserModel.findOneAndUpdate(
            {
              _id: giftFromUser._id,
            },
            {
              $addToSet: {
                stripeGiftSubscriptions: subscription.id,
              },
            },
            {
              session: session
            },
          ),
          UserConfigModel.findOneAndUpdate(
            {
              userId: giftToUser._id,
              gameId: gameId,
            },
            {
              $addToSet: {
                roles: Role.PRO
              }
            },
            {
              session: session
            },
          ),
          // TODO: Figure a way to get the game ID from the subscription object since each game should be different, but for now this is fine
          createNewProUserNotification(gameId, giftToUser._id, giftFromUser._id),
          queueDiscordWebhook(DiscordChannel.DevPriv, `💸 [${giftFromUser.name}](https://thinky.gg/profile/${giftFromUser.name}) just gifted ${quantity} ${type === GiftType.Yearly ? 'year' : 'month'}${quantity === 1 ? '' : 's'} of Pro to [${giftToUser.name}](https://thinky.gg/profile/${giftToUser.name})`)
        ]);

        // if the game is thinky, then we should findOneAndUpdate the userconfigmodel for all the other games too
        if (gameId === GameId.THINKY) {
          await giveAccessToAllGames(giftToUser._id, session);
        }
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
  
  const { gameId, productName } = await getGameFromSession(properties);

  const customerId = properties.customer;

  let error: string | undefined;

  // if the user is already a pro subscriber, we don't want to do anything
  const userToUpgradeConfig = await UserConfigModel.findOne({ userId: userToUpgrade._id, gameId: gameId });

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
          UserModel.findOneAndUpdate(
            {
              _id: userToUpgrade._id,
            },
            {
              stripeCustomerId: customerId,
            },
            {
              session: session,
              new: true,
            },
          ),
          UserConfigModel.findOneAndUpdate(
            {
              userId: userToUpgrade._id,
              gameId: gameId,
            },
            {
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
          queueDiscordWebhook(DiscordChannel.DevPriv, `💸 NEW SUBSCRIBER! [${userToUpgrade.name}](https://thinky.gg/profile/${userToUpgrade.name}) just subscribed to ${productName}!`),
        ]);

        // Move giveAccessToAllGames inside the transaction to ensure atomicity
        if (gameId === GameId.THINKY) {
          await giveAccessToAllGames(userToUpgrade._id, session);
        }
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
export async function giveAccessToAllGames(userId: Types.ObjectId, session?: ClientSession) {
  // Validate userId
  if (!userId || !Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid userId provided to giveAccessToAllGames');
  }

  await Promise.all(Object.values(GameId)
    .filter(id => id !== GameId.THINKY && typeof id === 'string') // Ensure valid game IDs
    .map(id => UserConfigModel.findOneAndUpdate(
      { userId: userId, gameId: id },
      {
        userId: userId,
        gameId: id,
        $addToSet: { roles: Role.PRO }
      },
      { 
        session: session,
        upsert: true,
        runValidators: true // Ensure schema validation runs
      }
    )));
}

export async function downgradeAccessToAllGames(userId: Types.ObjectId, session?: ClientSession) {
  // Validate userId
  if (!userId || !Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid userId provided to downgradeAccessToAllGames');
  }

  await Promise.all(Object.values(GameId)
    .filter(id => id !== GameId.THINKY && typeof id === 'string') // Ensure valid game IDs
    .map(id => UserConfigModel.findOneAndUpdate(
      { userId: userId, gameId: id },
      { $pull: { roles: Role.PRO } },
      { 
        session: session,
        runValidators: true // Ensure schema validation runs
      }
    )));
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
  if (process.env.STRIPE_CONNECTED_ACCOUNT_ID === undefined) {
    return `splitPaymentIntent(${paymentIntentId}): missing STRIPE_CONNECTED_ACCOUNT_ID`;
  }

  // if all of the validation checks have passed, make sure we haven't processed this payment intent already
  const kvKey = `split-payment-intent-${paymentIntentId}`;
  const keyValue = await KeyValueModel.findOneAndUpdate<KeyValue>(
    { gameId: GameId.THINKY, key: kvKey, value: true },
    { gameId: GameId.THINKY, key: kvKey, value: true },
    { upsert: true }
  );

  if (keyValue) {
    return `splitPaymentIntent(${paymentIntentId}): already processed`;
  }

  await stripe.transfers.create({
    amount: split,
    currency: 'usd',
    source_transaction: charge.id,
    destination: process.env.STRIPE_CONNECTED_ACCOUNT_ID as string,
  });

  logger.info(`splitPaymentIntent transferred ${split} from ${paymentIntentId}`);
}

//create a small class with createStripeSigned as a member function makes it easier to mock
/* istanbul ignore next */
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
      const { gameId } = await getGameFromSubscription(subscription);
      const user = await UserModel.findOne({ stripeCustomerId: customerId }).lean<User>();

      if (!user) {
        // there must be a matching userconfig in this case, so we need to return an error here
        error = `User with customer id ${customerId} for game ${gameId} does not exist`;
      } else {
        // we need to check if this is a gift subscription so we can downgrade the appropriate user
        // looks like a regular downgrade subscription of pro
        error = await subscriptionDeleted(user, subscription);
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
    } else {
      // this is a regular subscription from someone who has already been a pro subscriber for another game
      const subscription = dataObject as Stripe.Subscription;
      const metadata = subscription.metadata;

      // we should have a userId in metadata
      const userId = metadata.userId;
      const gameId = metadata.gameId;

      if (!userId || !gameId) {
        // we want to log the error
        error = 'Need both userId and gameId in metadata';
      } else {
        const userTarget = await UserModel.findById(userId);

        if (!userTarget) {
          // this would be super rare... like someone paying then right away deleting their user account in between
          error = `User with id ${userId} does not exist`;
        } else {
          const game = getGameFromId(gameId as GameId);
          const session = await mongoose.startSession();

          try {
            await session.withTransaction(async () => {
              await Promise.all([
                UserConfigModel.findOneAndUpdate(
                  { userId: userTarget._id, gameId: gameId },
                  { userId: userId, gameId: gameId, $addToSet: { roles: Role.PRO } },
                  { upsert: true, session }
                ),
                createNewProUserNotification(gameId as GameId, userTarget._id),
                queueDiscordWebhook(DiscordChannel.DevPriv, `💸 NEW SUBSCRIBER! [${userTarget.name}](https://thinky.gg/profile/${userTarget.name}) just subscribed to ${game.displayName} ${metadata?.type}!`)
              ]);

              // if the game is thinky, then we should upsert the userconfigmodel for all the other games too
              if (gameId === GameId.THINKY) {
                await giveAccessToAllGames(userTarget._id, session);
              }
            });

            session.endSession();
          } catch (err: any) {
            logger.error(err);
            session.endSession();
            error = err?.message;
          }
        }
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
