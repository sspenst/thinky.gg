import { Types } from 'mongoose';
import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import TestId from '../../../constants/testId';
import { logger } from '../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../lib/getTokenCookie';
import { getServerSideProps } from '../../../pages/edit/collection/[id]';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
//enableFetchMocks()

describe('pages/collection/edit/[id] page', () => {
  test('getServerProps with no params', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const context = {
      query: {}
    };

    const ret = await getServerSideProps(context as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeUndefined();
    expect(ret.redirect).toBeDefined();
    expect(ret.redirect?.destination).toBe('/login');
  });
  test('getServerProps with not found id', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const context = {
      query: {
        id: (new Types.ObjectId()).toString(),
      },
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER),
        }
      },
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeUndefined();
    expect(ret.notFound).toBeTruthy();
  });
  test('getServerProps with params', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const context = {
      query: {
        id: TestId.COLLECTION,
      },
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER),
        }
      },
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.redirect).toBeUndefined();
  });
});
