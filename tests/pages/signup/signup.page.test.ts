import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import TestId from '../../../constants/testId';
import { logger } from '../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../lib/getTokenCookie';
import { getServerSideProps } from '../../../pages/[subdomain]/signup';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('pages/signup page', () => {
  test('getServerProps with no params', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const context = {
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ret = await getServerSideProps(context as GetServerSidePropsContext) as any;

    expect(ret).toBeDefined();

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.redirect).toBeUndefined();
  });
  test('getServerProps with params', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const context = {
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER),
        }
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext) as any;

    expect(ret.props).toBeUndefined();
    expect(ret.redirect).toBeDefined();
    expect(ret.redirect?.destination).toBe('/home');
  });
});
