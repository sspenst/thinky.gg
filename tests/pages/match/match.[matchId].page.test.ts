import { ObjectId } from 'bson';
import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import TestId from '../../../constants/testId';
import { logger } from '../../../helpers/logger';
import { GenMongoWSEmitter } from '../../../lib/appSocketToClient';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../lib/getTokenCookie';
import { getServerSideProps } from '../../../pages/match/[matchId]';

beforeAll(async () => {
  await dbConnect();
  await GenMongoWSEmitter();
});
afterAll(async () => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
//enableFetchMocks()

describe('pages/match/[matchId] page', () => {
  test('getServerProps with no params', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const context = {
    };

    const ret = await getServerSideProps(context as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeUndefined();
    expect(ret.redirect).toBeDefined();
    expect(ret.redirect?.destination).toBe('/login');
  });
  test('getServerProps with params', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const context = {
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER),
        },
      },
      query: {
        matchId: new ObjectId().toString(),
      }
    };
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.redirect).toBeUndefined();
  });
});
