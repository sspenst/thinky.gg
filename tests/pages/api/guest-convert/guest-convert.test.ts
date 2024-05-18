import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import Role from '@root/constants/role';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import { UserModel } from '@root/models/mongoose';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import handler from '../../../../pages/api/guest-convert/index';

beforeAll(async () => {
  await dbConnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

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

describe('pages/api/guest-convert.ts', () => {
  test('converting a guest account with a name that already exists', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_GUEST),
          },
          body: {
            email: 'test111@gmail.com',
            name: 'test',
            password: 'newpassword',
          },
          headers: {
            origin: getGameFromId(DEFAULT_GAME_ID).baseUrl,
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(400);
        expect(response.error).toBe('Name already taken by another account');
      },
    });
  });

  test('converting a guest account with a email that already exists', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_GUEST),
          },
          body: {
            email: 'test@gmail.com',
            name: 'newname',
            password: 'newpassword',
          },
          headers: {
            origin: getGameFromId(DEFAULT_GAME_ID).baseUrl,
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(400);
        expect(response.error).toBe('Email already exists for another account');
      },
    });
  });
  test('converting a guest account', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_GUEST),
          },
          body: {
            email: 'newemail@newmail.com',
            name: 'newname',
            password: 'newpassword',
          },
          headers: {
            origin: getGameFromId(DEFAULT_GAME_ID).baseUrl,
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.updated).toBe(true);
        const user = await UserModel.findOne({ email: 'newemail@newmail.com' });

        expect(user).toBeTruthy();
        expect(user.name).toBe('newname');
        expect(user.roles).toContain(Role.FORMER_GUEST);
        expect(user.roles).not.toContain(Role.GUEST);
      },
    });
  });
});
