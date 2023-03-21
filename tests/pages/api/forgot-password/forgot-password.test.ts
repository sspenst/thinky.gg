import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import forgotPasswordHandler from '../../../../pages/api/forgot-password/index';

const throwMock = () => {
  throw new Error('Mock email error');
};
const acceptMock = () => {
  return { rejected: [] };
};

const sendMailRefMock = { ref: acceptMock };

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockImplementation(() => ({
    sendMail: jest.fn().mockImplementation(() => {
      return sendMailRefMock.ref();
    }),
  })),
}));

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('Forgot a password API should function right', () => {
  test('Sending forgot a password with wrong HTTP method should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',

          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await forgotPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Sending forgot a password request without parameters should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await forgotPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid body.email');
        expect(res.status).toBe(400);
      },
    });
  });

  test('Sending forgot a password with an invalid email should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            email: 'test@tregargfest.com'
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await forgotPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Could not find an account with this email');
        expect(res.status).toBe(404);
      },
    });
  });
  test('Sending forgot a password request with correct parameters should succeed', async () => {
    sendMailRefMock.ref = acceptMock;

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            email: 'test@gmail.com'
          },
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000',
          },
        } as unknown as NextApiRequestWithAuth;

        await forgotPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Sending forgot a password request when sendMail throws an error should fail gracefully', async () => {
    sendMailRefMock.ref = throwMock;

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            email: 'test@gmail.com'
          },
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000',
          },
        } as unknown as NextApiRequestWithAuth;

        await forgotPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Could not send password reset email');
        expect(res.status).toBe(500);
      },
    });
  });
});
