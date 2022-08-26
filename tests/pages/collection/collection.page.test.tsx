import { ObjectId } from 'bson';
import { GetServerSidePropsContext } from 'next';
import TestId from '../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../lib/getTokenCookie';
import { getServerSideProps } from '../../../pages/collection/[id]';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
//enableFetchMocks()

describe('pages/collection page', () => {
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
  test('getServerSideProps not logged in and with no id', async () => {
    // Created from initialize db file
    const context = {
      params: {

      }
    };
    const ret = await getServerSideProps(context as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeUndefined();
    expect(ret.redirect).toBeDefined();
    expect(ret.redirect?.destination).toBe('/');
    expect(ret.redirect?.permanent).toBe(false);
  });
  test('getServerSideProps not logged in and with valid params', async () => {
    // Created from initialize db file
    const context = {
      params: {
        id: TestId.COLLECTION
      },

    };
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props?.collection).toBeDefined();
    expect(ret.props?.collection._id).toBe(TestId.COLLECTION);
  }
  );
  test('getServerSideProps logged in and with valid params', async () => {
    // Created from initialize db file
    const context = {
      params: {
        id: TestId.COLLECTION
      },
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER)
        }

      },
    };
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props?.collection).toBeDefined();
    expect(ret.props?.collection._id).toBe(TestId.COLLECTION);
  }
  );
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
  }
  );
});
