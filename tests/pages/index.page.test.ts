import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import { logger } from '../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';
import { getServerSideProps } from '../../pages/index';

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
    const context = {
      query: {

      }
    };
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props?.levelOfDay).toBeDefined();
  });
});
