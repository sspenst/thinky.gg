import { getServerSideProps } from '@root/pages/[subdomain]/sitemap';
import { ServerResponse } from 'http';
import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import { logger } from '../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';
import { UserModel } from '../../models/mongoose';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
describe('testing sitemap', () => {
  test('sitemap no secret', async () => {
    const context = {
      query: {

      }
    };
    const sitemap = await getServerSideProps(context as GetServerSidePropsContext);

    expect(sitemap).toBeDefined();
    expect(sitemap.notFound).toBe(true);
  });
  test('sitemap with secret', async () => {
    // mock http.ServerResponse
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    const mockedResponse = {
      statusCode: 200,
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    } as unknown as ServerResponse;

    const key = process.env.SITEMAP_PRIV_KEY || '...';
    const context = {
      query: {
        key: key,

      },
      res: mockedResponse
    };

    const sitemap = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(sitemap).toBeDefined();
    expect(sitemap.notFound).toBeUndefined();
  });
  test('sitemap with secret, error occuring in query', async () => {
    // mock http.ServerResponse
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(UserModel, 'find').mockImplementation(() => {
      throw new Error('mocked error');
    });
    const mockedResponse = {
      statusCode: 200,
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    } as unknown as ServerResponse;

    const key = process.env.SITEMAP_PRIV_KEY || '...';
    const context = {
      query: {
        key: key,

      },
      res: mockedResponse
    };

    const sitemap = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(sitemap).toBeDefined();
    expect((sitemap.props?.error as Error).toString()).toBe('Error: mocked error');
  });
});
