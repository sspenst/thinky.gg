import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import TestId from '../../../constants/testId';
import { logger } from '../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../lib/getTokenCookie';
import { getServerSideProps } from '../../../pages/[subdomain]/collection/[username]/[slugName]';

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
  test('getServerSideProps not logged in and with empty params', async () => {
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
        username: 'test',
        slugName: 'test-collection'
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
        username: 'test',
        slugName: 'test-collection'
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
    expect(ret.props?.collection.userId).toBeDefined();
    expect(ret.props?.collection.userId.name).toBe('test');
    expect(ret.props?.collection.userId.password).toBeUndefined();
  }
  );
  test('getServerSideProps with valid params that doesnt exist', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    // Created from initialize db file
    const context = {
      params: {
        username: 'test',
        slugName: 'not-existing-blah-collection-2'
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
