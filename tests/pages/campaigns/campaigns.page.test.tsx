import { GetServerSidePropsContext } from 'next';
import TestId from '../../../constants/testId';
import { logger } from '../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { CollectionModel } from '../../../models/mongoose';
import { getServerSideProps } from '../../../pages/campaigns';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});

describe('pages/campaigns page', () => {
  test('getServerSideProps not logged in and with valid params', async () => {
    const ret = await getServerSideProps({} as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props?.enrichedCollections).toBeDefined();
    expect(ret.props?.enrichedCollections).toHaveLength(1);
    expect(ret.props?.enrichedCollections[0]._id).toBe(TestId.COLLECTION_OFFICIAL);
  });
  test('getServerSideProps throwing error', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as any));
    jest.spyOn(CollectionModel, 'find').mockReturnValueOnce({
      populate: () => {
        return {
          sort: () => {
            return null;
          }
        };
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const ret = await getServerSideProps({} as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.notFound).toBe(true);
  });
});
