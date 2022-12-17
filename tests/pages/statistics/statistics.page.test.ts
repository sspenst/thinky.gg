import { GetServerSidePropsContext } from 'next';
import TestId from '../../../constants/testId';
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

    console.log(ret);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props.searchQuery).toStrictEqual(DEFAULT_QUERY);
    expect(ret.props.totalRows).toBe(4);
    expect(ret.props.users[0]._id).toBe(TestId.USER);
  }
  );
  test('getServerSideProps get null from getStatistics', async () => {
    jest.spyOn(UserModel, 'aggregate').mockImplementation(() => {
      return null;
    });
    await expect(() => getServerSideProps({} as GetServerSidePropsContext)).rejects.toThrow('Error querying users');
  }
  );
});
