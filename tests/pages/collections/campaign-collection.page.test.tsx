import { ObjectId } from 'bson';
import { GetServerSidePropsContext } from 'next';
import TestId from '../../../constants/testId';
import { logger } from '../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../lib/getTokenCookie';
import { CollectionModel } from '../../../models/mongoose';
import { getServerSideProps } from '../../../pages/collections/[index]';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
//enableFetchMocks()

describe('pages/collections page', () => {
  test('getServerSideProps not logged in and with no params', async () => {
    // Created from initialize db file
    const context = {

    };
    const ret = await getServerSideProps(context as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeUndefined();
    expect(ret.redirect).toBeDefined();
    expect(ret.redirect?.destination).toBe('/');
    expect(ret.redirect?.permanent).toBe(false);
  }
  );
  test('getServerSideProps not logged in and with no index', async () => {
    // Created from initialize db file
    const context = {
      params: {

      }
    };
    const ret = await getServerSideProps(context as GetServerSidePropsContext);

    expect(ret).toBeDefined();

    expect(ret.notFound).toBe(true);
  });
  test('getServerSideProps not logged in and not going to all', async () => {
    // Created from initialize db file
    const context = {
      params: {
        index: ''
      }
    };
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();

    expect(ret.notFound).toBe(true);
  });
  test('getServerSideProps not logged in and with valid params', async () => {
    // Created from initialize db file
    const context = {
      params: {
        index: 'all'
      },

    };
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props?.enrichedCollections).toBeDefined();
    expect(ret.props?.enrichedCollections).toHaveLength(1);
    expect(ret.props?.enrichedCollections[0]._id).toBe(TestId.COLLECTION_OFFICIAL);
  });

  test('getServerSideProps with valid objectid that doesnt exist', async () => {
    // Created from initialize db file
    const context = {
      params: {
        id: new ObjectId()
      },
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER)
        }

      },
    };
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.notFound).toBe(true);
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
    // Created from initialize db file
    const context = {
      params: {
        index: 'all'
      },

    };
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();

    expect(ret.notFound).toBe(true);
  });
});
