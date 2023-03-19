import { enableFetchMocks } from 'jest-fetch-mock';
import mongoose from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import Stripe from 'stripe';
import Role from '../../../../constants/role';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { UserConfigModel, UserModel } from '../../../../models/mongoose';
import handler, { StripeWebhookHelper } from '../../../../pages/api/stripe-webhook/index';

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
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2022-11-15',
});
const stripe_secret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_123';

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

describe('pages/api/stripe-webhook/index.ts', () => {
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
  test('some unknown event', async () => {
    // Create a mock checkout.session.completed event
    const mockEvent = createMockStripeEvent('checkout.session.completed', {
      id: 'cs_test_123',
      client_reference_id: 'user_123',
      customer: 'customer_id_123',
    });

    // Create a payload buffer and signature
    const payload = JSON.stringify(mockEvent);

    // convert payload to a readable stream
    const readablePayload = Buffer.from(payload);

    jest.spyOn(StripeWebhookHelper, 'createStripeSigned').mockImplementation(async () => {
      return mockEvent as unknown as Stripe.Event;
    });
    const signature = stripe.webhooks.generateTestHeaderString({ payload: payload, secret: stripe_secret as string });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          headers: {
            ...DefaultReq.headers,
            'stripe-signature': signature,
          },
          body: readablePayload

        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('No client reference id (or is not valid object id)');
        expect(res.status).toBe(400);
        // Add any other assertions to validate the expected side effects of the subscription
      },
    });
  });
  test('some valid user subscribes', async () => {
    // Create a mock checkout.session.completed event
    const mockEvent = createMockStripeEvent('checkout.session.completed', {
      id: 'cs_test_123',
      client_reference_id: TestId.USER,
      customer: 'customer_id_123',
      // Add any other required fields for your specific implementation
    });

    // Create a payload buffer and signature
    const payload = JSON.stringify(mockEvent);
    const signature = stripe.webhooks.generateTestHeaderString({ payload: payload, secret: stripe_secret as string });

    // convert payload to a readable stream
    const readablePayload = Buffer.from(payload);

    jest.spyOn(StripeWebhookHelper, 'createStripeSigned').mockImplementation(async () => {
      return mockEvent as unknown as Stripe.Event;
    });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          headers: {
            ...DefaultReq.headers,
            'stripe-signature': signature,
          },
          body: readablePayload

        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();

        expect(res.status).toBe(200);

        const [user, userConfig] = await Promise.all([UserModel.findById(TestId.USER), UserConfigModel.findOne({ userId: TestId.USER }, { stripeCustomerId: 1 })]);

        expect(user.roles).toContain(Role.PRO_SUBSCRIBER);
        expect(userConfig.stripeCustomerId).toBe('customer_id_123');
        // Add any other assertions to validate the expected side effects of the subscription
      },
    });
  });
  test('some valid unsubscribes', async () => {
    // Create a mock checkout.session.completed event
    const mockEvent = createMockStripeEvent('customer.subscription.deleted', {
      id: 'cs_test_123',
      client_reference_id: TestId.USER,
      customer: 'customer_id_123',
      // Add any other required fields for your specific implementation
    });

    // Create a payload buffer and signature
    const payload = JSON.stringify(mockEvent);
    const signature = stripe.webhooks.generateTestHeaderString({ payload: payload, secret: stripe_secret as string });

    // convert payload to a readable stream
    const readablePayload = Buffer.from(payload);

    jest.spyOn(StripeWebhookHelper, 'createStripeSigned').mockImplementation(async () => {
      return mockEvent as unknown as Stripe.Event;
    });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          headers: {
            ...DefaultReq.headers,
            'stripe-signature': signature,
          },
          body: readablePayload

        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();

        expect(res.status).toBe(200);

        const [user, userConfig] = await Promise.all([UserModel.findById(TestId.USER), UserConfigModel.findOne({ userId: TestId.USER }, { stripeCustomerId: 1 })]);

        expect(user.roles).not.toContain(Role.PRO_SUBSCRIBER);
        expect(userConfig.stripeCustomerId).toBeNull();
        // Add any other assertions to validate the expected side effects of the subscription
      },
    });
  });
  test('resubscribe', async () => {
    // Create a mock checkout.session.completed event
    const mockEvent = createMockStripeEvent('checkout.session.completed', {
      id: 'cs_test_123',
      client_reference_id: TestId.USER,
      customer: 'customer_id_123',
      // Add any other required fields for your specific implementation
    });

    // Create a payload buffer and signature
    const payload = JSON.stringify(mockEvent);
    const signature = stripe.webhooks.generateTestHeaderString({ payload: payload, secret: stripe_secret as string });

    // convert payload to a readable stream
    const readablePayload = Buffer.from(payload);

    jest.spyOn(StripeWebhookHelper, 'createStripeSigned').mockImplementation(async () => {
      return mockEvent as unknown as Stripe.Event;
    });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          headers: {
            ...DefaultReq.headers,
            'stripe-signature': signature,
          },
          body: readablePayload

        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();

        expect(res.status).toBe(200);

        const [user, userConfig] = await Promise.all([UserModel.findById(TestId.USER), UserConfigModel.findOne({ userId: TestId.USER }, { stripeCustomerId: 1 })]);

        expect(user.roles).toContain(Role.PRO_SUBSCRIBER);
        expect(userConfig.stripeCustomerId).toBe('customer_id_123');
        // Add any other assertions to validate the expected side effects of the subscription
      },
    });
  });
  test('invoice payment failed but db error should cause user to stay on pro plan', async () => {
    // Create a mock invoice.payment_failed event
    const mockEvent = createMockStripeEvent('invoice.payment_failed', {
      id: 'invoice_test_123',
      customer: 'customer_id_123',
      // Add any other required fields for your specific implementation
    });

    // Create a payload buffer and signature
    const payload = JSON.stringify(mockEvent);
    const signature = stripe.webhooks.generateTestHeaderString({ payload: payload, secret: stripe_secret as string });

    // Convert payload to a readable stream
    const readablePayload = Buffer.from(payload);

    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(StripeWebhookHelper, 'createStripeSigned').mockImplementation(async () => {
      return mockEvent as unknown as Stripe.Event;
    });
    jest.spyOn(UserConfigModel, 'findOneAndUpdate').mockImplementationOnce( () => {
      throw new Error('mock error');
    });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          headers: {
            ...DefaultReq.headers,
            'stripe-signature': signature,
          },
          body: readablePayload
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('mock error');

        expect(res.status).toBe(400);

        const [user, userConfig] = await Promise.all([UserModel.findById(TestId.USER), UserConfigModel.findOne({ userId: TestId.USER }, { stripeCustomerId: 1 })]);

        expect(user.roles).toContain(Role.PRO_SUBSCRIBER);
        expect(userConfig.stripeCustomerId).toBe('customer_id_123');
        // Add any other assertions to validate the expected side effects of the payment failure
      },
    });
  });
  test('invoice payment failed', async () => {
    // Create a mock invoice.payment_failed event
    const mockEvent = createMockStripeEvent('invoice.payment_failed', {
      id: 'invoice_test_123',
      customer: 'customer_id_123',
      // Add any other required fields for your specific implementation
    });

    // Create a payload buffer and signature
    const payload = JSON.stringify(mockEvent);
    const signature = stripe.webhooks.generateTestHeaderString({ payload: payload, secret: stripe_secret as string });

    // Convert payload to a readable stream
    const readablePayload = Buffer.from(payload);

    jest.spyOn(StripeWebhookHelper, 'createStripeSigned').mockImplementation(async () => {
      return mockEvent as unknown as Stripe.Event;
    });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          headers: {
            ...DefaultReq.headers,
            'stripe-signature': signature,
          },
          body: readablePayload
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();

        expect(res.status).toBe(200);

        const [user, userConfig] = await Promise.all([UserModel.findById(TestId.USER), UserConfigModel.findOne({ userId: TestId.USER }, { stripeCustomerId: 1 })]);

        expect(user.roles).not.toContain(Role.PRO_SUBSCRIBER);
        expect(userConfig.stripeCustomerId).toBeNull();
        // Add any other assertions to validate the expected side effects of the payment failure
      },
    });
  });
  test('resubscribe but this time mock an error in the db for one of the calls', async () => {
    // Create a mock checkout.session.completed event
    const mockEvent = createMockStripeEvent('checkout.session.completed', {
      id: 'cs_test_123',
      client_reference_id: TestId.USER,
      customer: 'customer_id_123',
      // Add any other required fields for your specific implementation
    });

    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    // Create a payload buffer and signature
    const payload = JSON.stringify(mockEvent);
    const signature = stripe.webhooks.generateTestHeaderString({ payload: payload, secret: stripe_secret as string });

    // convert payload to a readable stream
    const readablePayload = Buffer.from(payload);

    jest.spyOn(StripeWebhookHelper, 'createStripeSigned').mockImplementation(async () => {
      return mockEvent as unknown as Stripe.Event;
    });

    jest.spyOn(UserConfigModel, 'findOneAndUpdate').mockImplementationOnce( () => {
      throw new Error('mock error');
    });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          headers: {
            ...DefaultReq.headers,
            'stripe-signature': signature,
          },
          body: readablePayload

        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(400);
        expect(response.error).toBe('mock error');

        const [user, userConfig] = await Promise.all([UserModel.findById(TestId.USER), UserConfigModel.findOne({ userId: TestId.USER }, { stripeCustomerId: 1 })]);

        expect(user.roles).not.toContain(Role.PRO_SUBSCRIBER);
        expect(userConfig.stripeCustomerId).toBeNull();
        // Add any other assertions to validate the expected side effects of the subscription
      },
    });
  });
});
