import { Aggregate } from 'mongoose';
import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import TestId from '../../../constants/testId';
import { logger } from '../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { UserModel } from '../../../models/mongoose';
import { DEFAULT_QUERY, getServerSideProps } from '../../../pages/statistics/index';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
//enableFetchMocks()

describe('pages/statistics page', () => {
  test('getServerSideProps not logged in and with no params', async () => {
    const ret = await getServerSideProps({} as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props.searchQuery).toStrictEqual(DEFAULT_QUERY);
    expect(ret.props.totalRows).toBe(3);
    expect(ret.props.users[0]._id).toBe(TestId.USER);
  }
  );
  test('getServerSideProps get null from getStatistics', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(UserModel, 'aggregate').mockImplementation(() => {
      return null as unknown as Aggregate<unknown[]>;
    });
    await expect(() => getServerSideProps({} as GetServerSidePropsContext)).rejects.toThrow('Error querying users');
  }
  );
});
