import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import TestId from '../../constants/testId';
import { logger } from '../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';
import { getTokenCookieValue } from '../../lib/getTokenCookie';
import { getServerSideProps } from '../../pages/home/index';
import { getStaticProps } from '../../pages/index';

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
  test('getStaticProps with no params', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const ret = await getStaticProps();

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props.levels).toHaveLength(3);
    expect(ret.props.levels[0]._id).toBe(TestId.LEVEL);
    expect(ret.props.reviews).toHaveLength(1);
    expect(ret.props.reviews[0]._id).toBe(TestId.REVIEW);
  });
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
    expect(ret.props?.levels).toHaveLength(3);
    expect(ret.props?.levelOfDay).toBeDefined();
    expect(ret.props?.reviews).toHaveLength(1);
  });
});
