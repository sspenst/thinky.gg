import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { GetServerSidePropsContext } from 'next';
import { getServerSideProps } from '../../../pages/[subdomain]/level-of-the-day/index';
import * as levelPageProps from '../../../pages/[subdomain]/level/[username]/[slugName]';
import * as levelOfDayApi from '../../../pages/api/level-of-day';

// Mock the imported modules
jest.mock('../../../pages/api/level-of-day', () => ({
  getLevelOfDay: jest.fn(),
}));

jest.mock('../../../pages/[subdomain]/level/[username]/[slugName]', () => ({
  getServerSideProps: jest.fn(),
}));

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('pages/[subdomain]/level-of-the-day', () => {
  const mockReq = {
    headers: {
      host: 'localhost:3000',
    },
  };

  describe('getServerSideProps', () => {
    test('getServerSideProps should delegate to level page with correct parameters', async () => {
      const mockGetLevelOfDay = levelOfDayApi.getLevelOfDay as jest.MockedFunction<typeof levelOfDayApi.getLevelOfDay>;
      const mockGetServerSidePropsFromLevel = levelPageProps.getServerSideProps as jest.MockedFunction<typeof levelPageProps.getServerSideProps>;

      const mockLevelOfDay = {
        _id: 'level123',
        slug: 'test-level/awesome-level',
        userId: {
          name: 'testuser',
        },
      } as any;

      mockGetLevelOfDay.mockResolvedValue(mockLevelOfDay);
      mockGetServerSidePropsFromLevel.mockResolvedValue({
        props: { level: mockLevelOfDay },
      } as any);

      const context = {
        req: mockReq,
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(mockGetLevelOfDay).toHaveBeenCalledWith('pathology');
      expect(mockGetServerSidePropsFromLevel).toHaveBeenCalledWith({
        req: mockReq,
        params: {
          username: 'testuser',
          slugName: 'awesome-level',
        },
      });
      expect(result).toEqual({
        props: { level: mockLevelOfDay },
      });
    });

    test('getServerSideProps should handle level with undefined user (now works correctly)', async () => {
      const mockGetLevelOfDay = levelOfDayApi.getLevelOfDay as jest.MockedFunction<typeof levelOfDayApi.getLevelOfDay>;
      const mockGetServerSidePropsFromLevel = levelPageProps.getServerSideProps as jest.MockedFunction<typeof levelPageProps.getServerSideProps>;

      // Mock level with undefined user - this was previously a bug, now fixed
      const mockLevelOfDay = {
        _id: 'level888',
        slug: 'test-level-undefined-user',
        userId: undefined, // This should be handled gracefully now
      } as any;

      mockGetLevelOfDay.mockResolvedValue(mockLevelOfDay);
      mockGetServerSidePropsFromLevel.mockResolvedValue({
        props: { level: mockLevelOfDay },
      } as any);

      const context = {
        req: mockReq,
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(mockGetLevelOfDay).toHaveBeenCalledWith('pathology');
      expect(mockGetServerSidePropsFromLevel).toHaveBeenCalledWith({
        req: mockReq,
        params: {
          username: undefined,
          slugName: 'test-level-undefined-user',
        },
      });
      expect(result).toEqual({
        props: { level: mockLevelOfDay },
      });
    });

    test('getServerSideProps should handle level with simple slug (no path)', async () => {
      const mockGetLevelOfDay = levelOfDayApi.getLevelOfDay as jest.MockedFunction<typeof levelOfDayApi.getLevelOfDay>;
      const mockGetServerSidePropsFromLevel = levelPageProps.getServerSideProps as jest.MockedFunction<typeof levelPageProps.getServerSideProps>;

      // Mock level with simple slug
      const mockLevelOfDay = {
        _id: 'simple123',
        slug: 'simple-slug',
        userId: {
          name: 'simpleuser',
        },
      } as any;

      mockGetLevelOfDay.mockResolvedValue(mockLevelOfDay);
      mockGetServerSidePropsFromLevel.mockResolvedValue({
        props: { level: mockLevelOfDay },
      } as any);

      const context = {
        req: mockReq,
      };

      await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(mockGetServerSidePropsFromLevel).toHaveBeenCalledWith({
        req: mockReq,
        params: {
          username: 'simpleuser',
          slugName: 'simple-slug', // Should be the whole slug since no slash
        },
      });
    });

    test('getServerSideProps should pass through the original request object', async () => {
      const mockGetLevelOfDay = levelOfDayApi.getLevelOfDay as jest.MockedFunction<typeof levelOfDayApi.getLevelOfDay>;
      const mockGetServerSidePropsFromLevel = levelPageProps.getServerSideProps as jest.MockedFunction<typeof levelPageProps.getServerSideProps>;

      const mockLevelOfDay = {
        _id: 'level999',
        name: 'Test Level',
        slug: 'user/test-level',
        userId: {
          name: 'testuser',
        },
      } as any;

      mockGetLevelOfDay.mockResolvedValue(mockLevelOfDay);
      mockGetServerSidePropsFromLevel.mockResolvedValue({
        props: { level: mockLevelOfDay },
      } as any);

      const customReq = {
        headers: {
          host: 'pathology.localhost:3000',
          'user-agent': 'test-agent',
        },
        cookies: {
          token: 'test-token',
        },
      };

      const context = {
        req: customReq,
      };

      await getServerSideProps(context as unknown as GetServerSidePropsContext);

      // Verify the original request is passed through unchanged
      expect(mockGetServerSidePropsFromLevel).toHaveBeenCalledWith({
        req: customReq,
        params: {
          username: 'testuser',
          slugName: 'test-level',
        },
      });
    });

    test('getServerSideProps should handle level with nested slug path', async () => {
      const mockGetLevelOfDay = levelOfDayApi.getLevelOfDay as jest.MockedFunction<typeof levelOfDayApi.getLevelOfDay>;
      const mockGetServerSidePropsFromLevel = levelPageProps.getServerSideProps as jest.MockedFunction<typeof levelPageProps.getServerSideProps>;

      // Mock level with nested path in slug
      const mockLevelOfDay = {
        _id: 'level456',
        name: 'Nested Path Level',
        slug: 'category/user/nested-level',
        userId: {
          name: 'creator',
        },
      } as any;

      mockGetLevelOfDay.mockResolvedValue(mockLevelOfDay);
      mockGetServerSidePropsFromLevel.mockResolvedValue({
        props: { level: mockLevelOfDay },
      } as any);

      const context = {
        req: mockReq,
      };

      await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(mockGetServerSidePropsFromLevel).toHaveBeenCalledWith({
        req: mockReq,
        params: {
          username: 'creator',
          slugName: 'nested-level', // Should get the last part after split
        },
      });
    });

    test('getServerSideProps should handle different game IDs', async () => {
      const mockGetLevelOfDay = levelOfDayApi.getLevelOfDay as jest.MockedFunction<typeof levelOfDayApi.getLevelOfDay>;
      const mockGetServerSidePropsFromLevel = levelPageProps.getServerSideProps as jest.MockedFunction<typeof levelPageProps.getServerSideProps>;

      // Test with Sokoban game
      const context = {
        req: {
          headers: {
            host: 'sokoban.localhost:3000',
          },
        },
      };

      const mockLevelOfDay = {
        _id: 'sokoban123',
        name: 'Sokoban Daily',
        slug: 'user/sokoban-daily',
        userId: {
          name: 'sokobanuser',
        },
      } as any;

      mockGetLevelOfDay.mockResolvedValue(mockLevelOfDay);
      mockGetServerSidePropsFromLevel.mockResolvedValue({
        props: { level: mockLevelOfDay },
      } as any);

      await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(mockGetLevelOfDay).toHaveBeenCalledWith('sokoban');
    });

    test('getServerSideProps should extract username from nested path', async () => {
      const mockGetLevelOfDay = levelOfDayApi.getLevelOfDay as jest.MockedFunction<typeof levelOfDayApi.getLevelOfDay>;
      const mockGetServerSidePropsFromLevel = levelPageProps.getServerSideProps as jest.MockedFunction<typeof levelPageProps.getServerSideProps>;

      const mockLevelOfDay = {
        _id: 'level456',
        slug: 'nested/path/to/level-name',
        userId: {
          name: 'levelcreator',
        },
      } as any;

      mockGetLevelOfDay.mockResolvedValue(mockLevelOfDay);
      mockGetServerSidePropsFromLevel.mockResolvedValue({
        props: { level: mockLevelOfDay },
      } as any);

      const context = {
        req: mockReq,
      };

      await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(mockGetServerSidePropsFromLevel).toHaveBeenCalledWith({
        req: mockReq,
        params: {
          username: 'levelcreator',
          slugName: 'level-name',
        },
      });
    });

    test('getServerSideProps should handle slug parsing edge cases', async () => {
      const mockGetLevelOfDay = levelOfDayApi.getLevelOfDay as jest.MockedFunction<typeof levelOfDayApi.getLevelOfDay>;
      const mockGetServerSidePropsFromLevel = levelPageProps.getServerSideProps as jest.MockedFunction<typeof levelPageProps.getServerSideProps>;

      const mockLevelOfDay = {
        _id: 'level999',
        slug: 'simple-slug',
        userId: {
          name: 'simpleuser',
        },
      } as any;

      mockGetLevelOfDay.mockResolvedValue(mockLevelOfDay);
      mockGetServerSidePropsFromLevel.mockResolvedValue({
        props: { level: mockLevelOfDay },
      } as any);

      const context = {
        req: mockReq,
      };

      await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(mockGetServerSidePropsFromLevel).toHaveBeenCalledWith({
        req: mockReq,
        params: {
          username: 'simpleuser',
          slugName: 'simple-slug',
        },
      });
    });

    test('getServerSideProps should handle null level of day', async () => {
      const mockGetLevelOfDay = levelOfDayApi.getLevelOfDay as jest.MockedFunction<typeof levelOfDayApi.getLevelOfDay>;
      const mockGetServerSidePropsFromLevel = levelPageProps.getServerSideProps as jest.MockedFunction<typeof levelPageProps.getServerSideProps>;

      mockGetLevelOfDay.mockResolvedValue(null);
      mockGetServerSidePropsFromLevel.mockResolvedValue({
        props: { level: null },
      } as any);

      const context = {
        req: mockReq,
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(mockGetLevelOfDay).toHaveBeenCalledWith('pathology');
      expect(mockGetServerSidePropsFromLevel).toHaveBeenCalledWith({
        req: mockReq,
        params: {
          username: undefined,
          slugName: undefined,
        },
      });
      expect(result).toEqual({
        props: { level: null },
      });
    });

    test('getServerSideProps should pass through level page response', async () => {
      const mockGetLevelOfDay = levelOfDayApi.getLevelOfDay as jest.MockedFunction<typeof levelOfDayApi.getLevelOfDay>;
      const mockGetServerSidePropsFromLevel = levelPageProps.getServerSideProps as jest.MockedFunction<typeof levelPageProps.getServerSideProps>;

      const mockLevelOfDay = {
        _id: 'level101',
        slug: 'passthrough-test',
        userId: {
          name: 'passthroughuser',
        },
      } as any;

      const mockResponse = {
        props: {
          level: mockLevelOfDay,
          additionalData: 'test',
        },
      } as any;

      mockGetLevelOfDay.mockResolvedValue(mockLevelOfDay);
      mockGetServerSidePropsFromLevel.mockResolvedValue(mockResponse);

      const context = {
        req: mockReq,
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(mockGetLevelOfDay).toHaveBeenCalledWith('pathology');
      expect(mockGetServerSidePropsFromLevel).toHaveBeenCalledWith({
        req: mockReq,
        params: {
          username: 'passthroughuser',
          slugName: 'passthrough-test',
        },
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
