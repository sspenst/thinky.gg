import { DEFAULT_GAME_ID, GameId } from '@root/constants/GameId';
import User from '@root/models/db/user';
import UserConfig from '@root/models/db/userConfig';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { skip } from 'node:test';
import Stripe from 'stripe';
import { Logger } from 'winston';
import Role from '../../../../constants/role';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { UserConfigModel, UserModel } from '../../../../models/mongoose';
import handler, { downgradeAccessToAllGames, giveAccessToAllGames, StripeWebhookHelper } from '../../../../pages/api/stripe-webhook/index';
import { stripe as stripeReal } from '../../../../pages/api/subscription';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async() => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
enableFetchMocks();

const DefaultReq = {
  method: 'POST',

  headers: {
    'content-type': 'application/json',
  },
};
const stripe = new Stripe('sk_test_...', {
  apiVersion: '2025-01-27.acacia',
});
const stripe_secret = process.env.NODE_ENV !== 'test' ? process.env.STRIPE_WEBHOOK_SECRET : 'whsec_test_secret';

function createMockStripeEvent(type: string, data = {}) {
  return {
    id: `evt_${Date.now()}`,
    object: 'event',
    api_version: '2025-01-27.acacia',
    created: Date.now(),
    data: {
      object: data,
    },
    livemode: false,
    pending_webhooks: 1,
    type: type,
  };
}

async function runStripeWebhookTest({
  eventType,
  payloadData,
  expectedError,
  expectedStatus,
  additionalAssertions,
  mockDbError = false,
}: {
  eventType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payloadData: any;
  expectedError: string | undefined;
  expectedStatus: number;
  additionalAssertions?: () => Promise<void>;
  mockDbError?: boolean;
}) {
  jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));

  if (expectedError) {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
  }

  const mockEvent = createMockStripeEvent(eventType, payloadData);

  const payload = JSON.stringify(mockEvent);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: payload,
    secret: stripe_secret as string,
  });

  const readablePayload = Buffer.from(payload);

  jest.spyOn(StripeWebhookHelper, 'createStripeSigned').mockImplementation(async () => {
    return mockEvent as unknown as Stripe.Event;
  });

  if (mockDbError) {
    jest.spyOn(UserConfigModel, 'findOneAndUpdate').mockImplementationOnce(() => {
      throw new Error('mock error');
    });
  }

  await testApiHandler({
    pagesHandler: async (_, res) => {
      const req: NextApiRequestWithAuth = {
        ...DefaultReq,
        headers: {
          ...DefaultReq.headers,
          'stripe-signature': signature,
        },
        body: readablePayload,
      } as unknown as NextApiRequestWithAuth;

      await handler(req, res);
    },
    test: async ({ fetch }) => {
      const res = await fetch();
      const response = await res.json();

      expect(response.error).toBe(expectedError);
      expect(res.status).toBe(expectedStatus);

      if (additionalAssertions) {
        await additionalAssertions();
      }
    },
  });
}

async function expectUserStatus(userId: string, role: Role | null, stripeCustomerId: string | null | undefined, stripeGiftCustomerId?: string | null | undefined) {
  const [user, userConfig] = await Promise.all([
    UserModel.findOne<User>({ _id: userId }, { stripeCustomerId: 1, stripeGiftSubscriptions: 1 }),
    UserConfigModel.findOne<UserConfig>({ userId: userId, gameId: DEFAULT_GAME_ID }, { roles: 1, gameId: 1 }),
  ]);

  if (role) {
    expect(userConfig?.roles).toContain(role);
  } else {
    expect(userConfig?.roles).not.toContain(Role.PRO);
  }

  expect(user?.stripeCustomerId).toBe(stripeCustomerId);

  if (stripeGiftCustomerId) {
    expect(user?.stripeGiftSubscriptions).toContain(stripeGiftCustomerId);
  }
}

describe('pages/api/stripe-webhook/index.ts', () => {
  jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
  test('regular call should error', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Webhook error: Invalid body');
        expect(res.status).toBe(400);
      },
    });
  });

  test('no client reference id for checkout complete event', async () => {
    await runStripeWebhookTest({
      eventType: 'checkout.session.completed',
      payloadData: {
        id: 'cs_test_123',
        client_reference_id: 'user_123',
        customer: 'customer_id_123',
      },
      expectedError: 'No client reference id (or is not valid object id)',
      expectedStatus: 400,
      additionalAssertions: async () => {
        //
      },
    });
  });
  test('unhandled event type should not error', async () => {
    await runStripeWebhookTest({
      eventType: 'some.event.type',
      payloadData: {
        id: 'cs_test_123',
        client_reference_id: TestId.USER,
        customer: 'customer_id_123',
      },
      expectedError: undefined,
      expectedStatus: 200,
    });
  });
  test('some invalid user subscribes', async () => {
    const fakeObjectId = new Types.ObjectId().toHexString();

    await runStripeWebhookTest({
      eventType: 'checkout.session.completed',
      payloadData: {
        id: 'cs_test_123',
        client_reference_id: fakeObjectId,
        customer: 'customer_id_123',
      },
      expectedError: 'User with id ' + fakeObjectId + ' does not exist',
      expectedStatus: 400,
      additionalAssertions: async () => {
        //
      },
    });
  });
  test('some valid user subscribes', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.subscriptions, 'search').mockResolvedValue({ data: [], } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.checkout.sessions, 'listLineItems').mockResolvedValue({ data: [{ price: { product: 'test' } }], } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.products, 'retrieve').mockResolvedValue({ name: 'Pathology Yearly' } as any);
    await runStripeWebhookTest({
      eventType: 'checkout.session.completed',
      payloadData: {
        id: 'cs_test_123',
        client_reference_id: TestId.USER,
        customer: 'customer_id_123',
      },
      expectedError: undefined,
      expectedStatus: 200,
      additionalAssertions: async () => {
        await expectUserStatus(TestId.USER, Role.PRO, 'customer_id_123');
      },
    });
  });

  test('giveAccessToAllGames should give Pro access to all games', async () => {
    await giveAccessToAllGames(new Types.ObjectId(TestId.USER));

    const userConfigs = await UserConfigModel.find<UserConfig>({ userId: TestId.USER });

    // Check that user has Pro role for all games except Thinky
    userConfigs.forEach(config => {
      expect(config.roles).toContain(Role.PRO);
      expect(config.userId.toString()).toBe(TestId.USER);
    });

    // Should have configs for all games except Thinky
    const expectedCount = Object.values(GameId).filter(id => id !== GameId.THINKY && typeof id === 'string').length;

    expect(userConfigs.length).toBe(expectedCount);
  });
  test('downgradeAccessToAllGames should remove Pro access from all games', async () => {
    // First give access to all games
    await giveAccessToAllGames(new Types.ObjectId(TestId.USER));

    // Then downgrade access
    await downgradeAccessToAllGames(new Types.ObjectId(TestId.USER));

    const userConfigs = await UserConfigModel.find<UserConfig>({ userId: TestId.USER });

    // Check that user no longer has Pro role for any games
    userConfigs.forEach(config => {
      expect(config.roles).not.toContain(Role.PRO);
      expect(config.userId.toString()).toBe(TestId.USER);
    });

    // Should still have configs for all games except Thinky
    const expectedCount = Object.values(GameId).filter(id => id !== GameId.THINKY && typeof id === 'string').length;

    expect(userConfigs.length).toBe(expectedCount);
  });

  test('user subscribes to Thinky should get Pro on all games', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.subscriptions, 'search').mockResolvedValue({ data: [], } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.checkout.sessions, 'listLineItems').mockResolvedValue({ data: [{ price: { product: 'test' } }], } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.products, 'retrieve').mockResolvedValue({ name: 'Thinky Yearly' } as any);
    await runStripeWebhookTest({
      eventType: 'checkout.session.completed',
      payloadData: {
        id: 'cs_test_123',
        client_reference_id: TestId.USER,
        customer: 'customer_id_123',
      },
      expectedError: undefined,
      expectedStatus: 200,
      additionalAssertions: async () => {
        const userConfigs = await UserConfigModel.find<UserConfig>({ userId: TestId.USER });

        userConfigs.forEach(config => {
          expect(config.roles).toContain(Role.PRO);
        });
        expect(userConfigs.length).toBeGreaterThan(1); // Ensure we're checking multiple games
      },
    });
  });
  skip('gifting Thinky Pro should give recipient Pro access to all games', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.products, 'retrieve').mockResolvedValue({ name: 'Thinky Yearly' } as any);
    await runStripeWebhookTest({
      eventType: 'customer.subscription.created',
      payloadData: {
        id: 'cs_test_123',
        metadata: {
          giftFromId: TestId.USER,
          giftToId: TestId.USER_B,
          gameId: GameId.THINKY
        }
      },
      expectedError: undefined,
      expectedStatus: 200,
      additionalAssertions: async () => {
        // Check that gift recipient has Pro role for all games
        const userConfigs = await UserConfigModel.find<UserConfig>({ userId: TestId.USER_B });

        userConfigs.forEach(config => {
          expect(config.roles).toContain(Role.PRO);
        });
        expect(userConfigs.length).toBeGreaterThan(1); // Ensure we're checking multiple games
      },
    });
  });
  test('unsubscribing from Thinky Pro should remove Pro access from all games', async () => {
    // Set up initial state with Pro access
    await giveAccessToAllGames(new Types.ObjectId(TestId.USER));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.products, 'retrieve').mockResolvedValue({ name: 'Thinky Yearly' } as any);
    await runStripeWebhookTest({
      eventType: 'customer.subscription.deleted',
      payloadData: {
        id: 'cs_test_123',
        customer: 'customer_id_123',
        items: {
          data: [{
            price: {
              product: 'thinky product',
            },
          }],
        }
      },
      expectedError: undefined,
      expectedStatus: 200,
      additionalAssertions: async () => {
        // Check that user no longer has Pro role for any games
        const userConfigs = await UserConfigModel.find<UserConfig>({ userId: TestId.USER });

        userConfigs.forEach(config => {
          expect(config.roles).not.toContain(Role.PRO);
        });
        expect(userConfigs.length).toBeGreaterThan(1); // Ensure we're checking multiple games
      },
    });
  });
  test('customer.subscription.deleted with undefined customerId', async () => {
    await runStripeWebhookTest({
      eventType: 'customer.subscription.deleted',
      payloadData: {
        id: 'cs_test_123',
        customer: undefined,
      },
      expectedError: 'No customerId',
      expectedStatus: 400,
    });
  });
  test('some valid but unknown user unsubscribes', async () => {
    const fakeCustomerId = 'fake_object_id_123';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.products, 'retrieve').mockResolvedValue({ name: 'Pathology Yearly' } as any);
    await runStripeWebhookTest({
      eventType: 'customer.subscription.deleted',
      payloadData: {
        id: 'cs_test_123',
        customer: fakeCustomerId,
        items: {
          data: [{
            price: {
              product: 'pathology product',
            },
          }],
        }
      },
      expectedError: 'User with customer id ' + fakeCustomerId + ' for game pathology does not exist',
      expectedStatus: 400,
    });
  });
  test('some valid unsubscribes', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.products, 'retrieve').mockResolvedValue({ name: 'Pathology Yearly' } as any);
    await runStripeWebhookTest({
      eventType: 'customer.subscription.deleted',
      payloadData: {
        id: 'cs_test_123',
        client_reference_id: TestId.USER,
        customer: 'customer_id_123',
        items: {
          data: [{
            price: {
              product: 'pathology product',
            },
          }],
        }
      },
      expectedError: undefined,
      expectedStatus: 200,
      additionalAssertions: async () => {
        await expectUserStatus(TestId.USER, null, 'customer_id_123'); // keep their customer id around
      },
    });
  });
  test('resubscribe', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.subscriptions, 'search').mockResolvedValue({ data: [], } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.checkout.sessions, 'listLineItems').mockResolvedValue({ data: [{ price: { product: 'test' } }], } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.products, 'retrieve').mockResolvedValue({ name: 'Pathology Yearly' } as any);
    await runStripeWebhookTest({
      eventType: 'checkout.session.completed',
      payloadData: {
        id: 'cs_test_123',
        client_reference_id: TestId.USER,
        customer: 'customer_id_123',
        items: {
          data: [{
            price: {
              product: 'pathology product',
            },
          }],
        }
      },
      expectedError: undefined,
      expectedStatus: 200,
      additionalAssertions: async () => {
        await expectUserStatus(TestId.USER, Role.PRO, 'customer_id_123');
      },
    });
  });
  test('resubscribe again should error saying you are already a pro subscriber', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.checkout.sessions, 'listLineItems').mockResolvedValue({ data: [{ price: { product: 'plan_id' } }], } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.products, 'retrieve').mockResolvedValue({ name: 'Pathology Yearly' } as any);
    await runStripeWebhookTest({
      eventType: 'checkout.session.completed',
      payloadData: {
        id: 'cs_test_123',
        client_reference_id: TestId.USER,
        customer: 'customer_id_123',
      },
      expectedError: 'User with id ' + TestId.USER + ' is already a pro subscriber',
      expectedStatus: 400,
      additionalAssertions: async () => {
        await expectUserStatus(TestId.USER, Role.PRO, 'customer_id_123');
      },
    });
  });
  test('gifting subscription', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.checkout.sessions, 'listLineItems').mockResolvedValue({ data: [{ price: { product: 'pathology' } }], } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.products, 'retrieve').mockResolvedValue({ name: 'Pathology Yearly' } as any);
    await runStripeWebhookTest({
      eventType: 'customer.subscription.created',
      payloadData: {
        id: 'cs_test_123',
        client_reference_id: TestId.USER,
        customer: 'customer_id_123',
        metadata: {
          giftFromId: TestId.USER,
          giftToId: TestId.USER_B,
        },
        items: {
          data: [{
            price: {
              product: 'pathology product',
            },
          }],
        }
      },
      expectedError: undefined,
      expectedStatus: 200,
      additionalAssertions: async () => {
        await expectUserStatus(TestId.USER_B, Role.PRO, undefined);
        await expectUserStatus(TestId.USER, Role.PRO, 'customer_id_123', 'cs_test_123');
      },
    });
  });
  test('regifting should not work since user is already on pro', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.checkout.sessions, 'listLineItems').mockResolvedValue({ data: [{ price: { product: 'plan_id' } }], } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.products, 'retrieve').mockResolvedValue({ name: 'Pathology Yearly' } as any);

    await runStripeWebhookTest({
      eventType: 'customer.subscription.created',
      payloadData: {
        id: 'cs_test_123',
        client_reference_id: TestId.USER,
        customer: 'customer_id_123',
        metadata: {
          giftFromId: TestId.USER,
          giftToId: TestId.USER_B,
        },
        items: {
          data: [{
            price: {
              product: 'pathology product',
            },
          }],
        }
      },
      expectedError: 'test is already a pro subscriber for this game. Error applying gift. Please contact support.',
      expectedStatus: 400,
      additionalAssertions: async () => {
        await expectUserStatus(TestId.USER_B, Role.PRO, undefined);
        await expectUserStatus(TestId.USER, Role.PRO, 'customer_id_123', 'cs_test_123');
      },
    });
  });
  test('invoice.payment_failed should always return 200', async () => {
    // NOTE: failed payments will not remove your pro subscription
    // stripe has retry logic when a payment fails and if all retries fail,
    // stripe will cancel the subscription with the customer.subscription.deleted event
    // https://dashboard.stripe.com/revenue_recovery/retries
    await runStripeWebhookTest({
      eventType: 'invoice.payment_failed',
      payloadData: {
        id: 'cs_test_123',
        customer: undefined,
        items: {
          data: [{
            price: {
              product: 'pathology product',
            },
          }],
        }
      },
      expectedError: undefined,
      expectedStatus: 200,
    });
  });
  test('customer.subscription.deleted but db error should cause user to stay on pro plan', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.products, 'retrieve').mockResolvedValue({ name: 'Pathology Yearly' } as any);

    await runStripeWebhookTest({
      eventType: 'customer.subscription.deleted',
      payloadData: {
        id: 'invoice_test_123',
        customer: 'customer_id_123',
        items: {
          data: [{
            price: {
              product: 'pathology product',
            },
          }],
        }
      },
      expectedError: 'mock error',
      expectedStatus: 400,
      additionalAssertions: async () => {
        await expectUserStatus(TestId.USER, Role.PRO, 'customer_id_123');
      },
      mockDbError: true,
    });
  });
  test('customer.subscription.deleted successfully', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(stripeReal.products, 'retrieve').mockResolvedValue({ name: 'Pathology Yearly' } as any);

    await runStripeWebhookTest({
      eventType: 'customer.subscription.deleted',
      payloadData: {
        id: 'invoice_test_123',
        customer: 'customer_id_123',
        items: {
          data: [{
            price: {
              product: 'pathology product',
            },
          }],
        }
      },
      expectedError: undefined,
      expectedStatus: 200,
      additionalAssertions: async () => {
        await expectUserStatus(TestId.USER, null, 'customer_id_123');
      },
    });
  });
  test('resubscribe but this time mock an error in the db for one of the calls', async () => {
    await runStripeWebhookTest({
      eventType: 'checkout.session.completed',
      payloadData: {
        id: 'cs_test_123',
        client_reference_id: TestId.USER,
        customer: 'customer_id_123',
      },
      expectedError: 'mock error',
      expectedStatus: 400,
      additionalAssertions: async () => {
        await expectUserStatus(TestId.USER, null, 'customer_id_123');
      },
      mockDbError: true,
    });
  });

  test('payment_intent.succeeded missing latest_charge', async () => {
    jest.spyOn(stripeReal.paymentIntents, 'retrieve').mockImplementation(async () => {
      return {} as Stripe.Response<Stripe.PaymentIntent>;
    });

    await runStripeWebhookTest({
      eventType: 'payment_intent.succeeded',
      payloadData: {
        id: 'pi_123',
      },
      expectedError: 'splitPaymentIntent(pi_123): missing latest_charge',
      expectedStatus: 400,
    });
  });

  test('payment_intent.succeeded missing balance_transaction.fee', async () => {
    jest.spyOn(stripeReal.paymentIntents, 'retrieve').mockImplementation(async () => {
      return {
        latest_charge: {},
      } as Stripe.Response<Stripe.PaymentIntent>;
    });

    await runStripeWebhookTest({
      eventType: 'payment_intent.succeeded',
      payloadData: {
        id: 'pi_123',
      },
      expectedError: 'splitPaymentIntent(pi_123): missing balance_transaction.fee',
      expectedStatus: 400,
    });
  });

  test('payment_intent.succeeded', async () => {
    process.env.STRIPE_CONNECTED_ACCOUNT_ID = 'blah';
    jest.spyOn(stripeReal.paymentIntents, 'retrieve').mockImplementation(async () => {
      return {
        amount: 300,
        latest_charge: {
          balance_transaction: {
            fee: 39,
          },
          id: 'ch_123',
        }
      } as Stripe.Response<Stripe.PaymentIntent>;
    });
    jest.spyOn(stripeReal.transfers, 'create').mockImplementation(async (params) => {
      expect(params.amount).toBe(Math.round((300 - 39) / 2));
      expect(params.source_transaction).toBe('ch_123');

      return {} as Stripe.Response<Stripe.Transfer>;
    });

    await runStripeWebhookTest({
      eventType: 'payment_intent.succeeded',
      payloadData: {
        id: 'pi_123',
      },
      expectedError: undefined,
      expectedStatus: 200,
    });
  });

  test('payment_intent.succeeded already processed', async () => {
    process.env.STRIPE_CONNECTED_ACCOUNT_ID = 'blah';
    jest.spyOn(stripeReal.paymentIntents, 'retrieve').mockImplementation(async () => {
      return {
        amount: 300,
        latest_charge: {
          balance_transaction: {
            fee: 39,
          },
          id: 'ch_123',
        }
      } as Stripe.Response<Stripe.PaymentIntent>;
    });
    jest.spyOn(stripeReal.transfers, 'create').mockImplementation(async (params) => {
      expect(params.amount).toBe(Math.round((300 - 39) / 2));
      expect(params.source_transaction).toBe('ch_123');

      return {} as Stripe.Response<Stripe.Transfer>;
    });

    await runStripeWebhookTest({
      eventType: 'payment_intent.succeeded',
      payloadData: {
        id: 'pi_123',
      },
      expectedError: 'splitPaymentIntent(pi_123): already processed',
      expectedStatus: 400,
    });
  });
});
