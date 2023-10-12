import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import Stripe from 'stripe';
import { Logger } from 'winston';
import Role from '../../../../constants/role';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { UserConfigModel, UserModel } from '../../../../models/mongoose';
import handler, { StripeWebhookHelper } from '../../../../pages/api/stripe-webhook/index';
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
const stripe = new Stripe('', {
  apiVersion: '2022-11-15',
});
const stripe_secret = process.env.NODE_ENV !== 'test' ? process.env.STRIPE_WEBHOOK_SECRET : 'whsec_test_secret';

function createMockStripeEvent(type: string, data = {}) {
  return {
    id: `evt_${Date.now()}`,
    object: 'event',
    api_version: '2022-11-15',
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
    handler: async (_, res) => {
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

async function expectUserStatus(userId: string, role: Role | null, stripeCustomerId: string | null) {
  const [user, userConfig] = await Promise.all([
    UserModel.findById(userId),
    UserConfigModel.findOne({ userId }, { stripeCustomerId: 1 }),
  ]);

  if (role) {
    expect(user.roles).toContain(role);
  } else {
    expect(user.roles).not.toContain(Role.PRO);
  }

  expect(userConfig.stripeCustomerId).toBe(stripeCustomerId);
}

describe('pages/api/stripe-webhook/index.ts', () => {
  jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
  test('regular call should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
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
  test('some valid but unknown user unsubscribes', async () => {
    const fakeCustomerId = 'fake_object_id_123';

    await runStripeWebhookTest({
      eventType: 'customer.subscription.deleted',
      payloadData: {
        id: 'cs_test_123',
        customer: fakeCustomerId,
      },
      expectedError: 'customer.subscription.deleted - UserConfig with customer id ' + fakeCustomerId + ' does not exist',
      expectedStatus: 400,
      additionalAssertions: async () => {
        //
      },
    });
  });
  test('some valid unsubscribes', async () => {
    await runStripeWebhookTest({
      eventType: 'customer.subscription.deleted',
      payloadData: {
        id: 'cs_test_123',
        client_reference_id: TestId.USER,
        customer: 'customer_id_123',
      },
      expectedError: undefined,
      expectedStatus: 200,
      additionalAssertions: async () => {
        await expectUserStatus(TestId.USER, null, null);
      },
    });
  });
  test('resubscribe', async () => {
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
  test('resubscribe again should error saying you are already a pro subscriber', async () => {
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
  test('invoice payment with anempty customerid', async () => {
    const fakeCustomerId = undefined;

    await runStripeWebhookTest({
      eventType: 'invoice.payment_failed',
      payloadData: {
        id: 'cs_test_123',
        customer: fakeCustomerId,
      },
      expectedError: 'No customerId',
      expectedStatus: 400,
      additionalAssertions: async () => {
        //
      },
    });
  });
  test('invoice payment for an unknown customerid', async () => {
    const fakeCustomerId = 'fake_customer_id';

    await runStripeWebhookTest({
      eventType: 'invoice.payment_failed',
      payloadData: {
        id: 'cs_test_123',
        customer: fakeCustomerId,
      },
      expectedError: undefined,
      expectedStatus: 200,
      additionalAssertions: async () => {
        //
      },
    });
  });
  test('invoice payment failed but db error should cause user to stay on pro plan', async () => {
    await runStripeWebhookTest({
      eventType: 'invoice.payment_failed',
      payloadData: {
        id: 'invoice_test_123',
        customer: 'customer_id_123',
      },
      expectedError: 'mock error',
      expectedStatus: 400,
      additionalAssertions: async () => {
        await expectUserStatus(TestId.USER, Role.PRO, 'customer_id_123');
      },
      mockDbError: true,
    });
  });

  test('invoice payment failed', async () => {
    await runStripeWebhookTest({
      eventType: 'invoice.payment_failed',
      payloadData: {
        id: 'invoice_test_123',
        customer: 'customer_id_123',
      },
      expectedError: undefined,
      expectedStatus: 200,
      additionalAssertions: async () => {
        await expectUserStatus(TestId.USER, null, null);
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
        await expectUserStatus(TestId.USER, null, null);
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
});
