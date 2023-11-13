import { GameId } from '@root/constants/GameId';
import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import TestId from '../../../constants/testId';
import { logger } from '../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../lib/getTokenCookie';
import { getServerSideProps } from '../../../pages/campaign/[slug]';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});

describe('pages/campaign/[slug] page', () => {
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
  });
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
  test('getServerSideProps not logged in and with pathology slug', async () => {
    // Created from initialize db file
    const context = {
      params: {
        slug: 'pathology',
      },
    };
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeUndefined();
    expect(ret.redirect).toBeDefined();
    expect(ret.redirect?.destination).toBe('/play');
    expect(ret.redirect?.permanent).toBe(false);
  });
  test('getServerSideProps not logged in and with valid params', async () => {
    // Created from initialize db file
    const context = {
      params: {
        slug: 'official-campaign',
      },

    };
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props?.campaign).toBeDefined();
    expect(ret.props?.campaign._id).toBe(TestId.CAMPAIGN_OFFICIAL);
    expect(ret.props?.enrichedCollections).toBeDefined();
    expect(ret.props?.enrichedCollections[0]._id).toBe(TestId.COLLECTION);
    expect(ret.props?.enrichedCollections[0].gameId).toBe(GameId.PATHOLOGY);
  });
  test('getServerSideProps logged in and with valid params', async () => {
    // Created from initialize db file
    const context = {
      params: {
        slug: 'official-campaign',
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
    expect(ret.props?.campaign).toBeDefined();
    expect(ret.props?.campaign._id).toBe(TestId.CAMPAIGN_OFFICIAL);
    expect(ret.props?.enrichedCollections).toBeDefined();
    expect(ret.props?.enrichedCollections[0]._id).toBe(TestId.COLLECTION);
  });
  test('getServerSideProps with valid params that doesnt exist', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    // Created from initialize db file
    const context = {
      params: {
        slug: 'unofficial-campaign',
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
});
