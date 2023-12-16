import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import TestId from '../../../constants/testId';
import { logger } from '../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../lib/getTokenCookie';
import { getServerSideProps } from '../../../pages/[subdomain]';

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

describe('pages/index page', () => {
  test('getServerSideProps but logged in', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const context = {
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER),
        },
      },
    };
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.redirect).toBeUndefined();
  });
  test('getServerSideProps but not logged in', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const context = {
      req: {

      },
    };
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeUndefined();
    expect(ret.redirect).toBeDefined();
    expect(ret.redirect?.destination).toBe('/');
  });
  test('getServerSideProps but not logged in', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const ret = await getServerSideProps({} as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeUndefined();
    expect(ret.redirect).toBeDefined();
    expect(ret.redirect?.destination).toBe('/');
  });
});
