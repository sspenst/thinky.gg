import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { LevelModel } from '@root/models/mongoose';
import { GetServerSidePropsContext } from 'next';
import { getServerSideProps } from '../../../pages/[subdomain]/level-of-the-day/index';

// Mock the level page's getServerSideProps since our function calls it
jest.mock('../../../pages/[subdomain]/level/[username]/[slugName]', () => ({
  getServerSideProps: jest.fn(),
}));

// Mock the getLevelOfDay function
jest.mock('../../../pages/api/level-of-day', () => ({
  getLevelOfDay: jest.fn(),
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
      host: 'pathology.localhost:3000',
    },
  };

  describe('getServerSideProps', () => {
    test('HAPPY PATH: Level of the day found and redirected', async () => {
      // Mock the imports
      const { getLevelOfDay } = require('../../../pages/api/level-of-day');
      const { getServerSideProps: getServerSidePropsFromLevel } = require('../../../pages/[subdomain]/level/[username]/[slugName]');

      // Mock level of the day data
      const mockLevelOfDay = {
        _id: 'level123',
        name: 'Daily Challenge',
        slug: 'user/daily-challenge',
        userId: {
          name: 'testuser',
        },
      };

      const mockLevelPageResult = {
        props: {
          level: mockLevelOfDay,
          reqUser: null,
        },
      };

      getLevelOfDay.mockResolvedValue(mockLevelOfDay);
      getServerSidePropsFromLevel.mockResolvedValue(mockLevelPageResult);

      const context = {
        req: mockReq,
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(getLevelOfDay).toHaveBeenCalledWith('pathology');
      expect(getServerSidePropsFromLevel).toHaveBeenCalledWith({
        req: mockReq,
        params: {
          username: 'testuser',
          slugName: 'daily-challenge',
        },
      });
      expect(result).toEqual(mockLevelPageResult);

      // In the actual page component, this would:
      // 1. Get the current level of the day
      // 2. Redirect to display it using the level page component
      // 3. Show the level as if accessed directly at /level/user/slug
    });

    test('getServerSideProps should handle level with nested slug path', async () => {
      const { getLevelOfDay } = require('../../../pages/api/level-of-day');
      const { getServerSideProps: getServerSidePropsFromLevel } = require('../../../pages/[subdomain]/level/[username]/[slugName]');

      // Mock level with nested path in slug
      const mockLevelOfDay = {
        _id: 'level456',
        name: 'Nested Path Level',
        slug: 'category/user/nested-level',
        userId: {
          name: 'creator',
        },
      };

      const mockLevelPageResult = {
        props: {
          level: mockLevelOfDay,
          reqUser: null,
        },
      };

      getLevelOfDay.mockResolvedValue(mockLevelOfDay);
      getServerSidePropsFromLevel.mockResolvedValue(mockLevelPageResult);

      const context = {
        req: mockReq,
      };

      await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(getServerSidePropsFromLevel).toHaveBeenCalledWith({
        req: mockReq,
        params: {
          username: 'creator',
          slugName: 'nested-level', // Should get the last part after split
        },
      });
    });

    test('getServerSideProps should handle null level of the day', async () => {
      const { getLevelOfDay } = require('../../../pages/api/level-of-day');
      const { getServerSideProps: getServerSidePropsFromLevel } = require('../../../pages/[subdomain]/level/[username]/[slugName]');

      // Mock no level of the day
      getLevelOfDay.mockResolvedValue(null);

      const mockLevelPageResult = {
        notFound: true,
      };

      getServerSidePropsFromLevel.mockResolvedValue(mockLevelPageResult);

      const context = {
        req: mockReq,
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(getLevelOfDay).toHaveBeenCalledWith('pathology');
      expect(getServerSidePropsFromLevel).toHaveBeenCalledWith({
        req: mockReq,
        params: {
          username: undefined,
          slugName: undefined,
        },
      });
      expect(result).toEqual(mockLevelPageResult);
    });

    test('getServerSideProps should handle different game IDs', async () => {
      const { getLevelOfDay } = require('../../../pages/api/level-of-day');
      const { getServerSideProps: getServerSidePropsFromLevel } = require('../../../pages/[subdomain]/level/[username]/[slugName]');

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
      };

      getLevelOfDay.mockResolvedValue(mockLevelOfDay);
      getServerSidePropsFromLevel.mockResolvedValue({
        props: { level: mockLevelOfDay },
      });

      await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(getLevelOfDay).toHaveBeenCalledWith('sokoban');
    });

    test('getServerSideProps should handle level with undefined user (now works correctly)', async () => {
      const { getLevelOfDay } = require('../../../pages/api/level-of-day');
      const { getServerSideProps: getServerSidePropsFromLevel } = require('../../../pages/[subdomain]/level/[username]/[slugName]');

      // Mock level with undefined user - this was previously a bug, now fixed
      const mockLevelOfDay = {
        _id: 'level888',
        slug: 'test-level-undefined-user',
        userId: undefined, // This should be handled gracefully now
      };

      getLevelOfDay.mockResolvedValue(mockLevelOfDay);
      getServerSidePropsFromLevel.mockResolvedValue({
        props: { level: mockLevelOfDay },
      });

      const context = {
        req: {
          headers: { host: 'localhost:3000' },
        },
        params: {},
      };

      // After bug fix, this should work without throwing an error
      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        props: { level: mockLevelOfDay },
      });

      // Verify that context.params was set correctly with undefined username
      expect(context.params).toEqual({
        username: undefined, // Should be undefined instead of throwing error
        slugName: 'test-level-undefined-user',
      });
    });

    test('getServerSideProps should handle level with simple slug (no path)', async () => {
      const { getLevelOfDay } = require('../../../pages/api/level-of-day');
      const { getServerSideProps: getServerSidePropsFromLevel } = require('../../../pages/[subdomain]/level/[username]/[slugName]');

      // Mock level with simple slug
      const mockLevelOfDay = {
        _id: 'simple123',
        name: 'Simple Level',
        slug: 'simple-level', // No slash
        userId: {
          name: 'simpleuser',
        },
      };

      getLevelOfDay.mockResolvedValue(mockLevelOfDay);
      getServerSidePropsFromLevel.mockResolvedValue({
        props: { level: mockLevelOfDay },
      });

      const context = {
        req: mockReq,
      };

      await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(getServerSidePropsFromLevel).toHaveBeenCalledWith({
        req: mockReq,
        params: {
          username: 'simpleuser',
          slugName: 'simple-level', // Should be the whole slug since no slash
        },
      });
    });

    test('getServerSideProps should pass through the original request object', async () => {
      const { getLevelOfDay } = require('../../../pages/api/level-of-day');
      const { getServerSideProps: getServerSidePropsFromLevel } = require('../../../pages/[subdomain]/level/[username]/[slugName]');

      const mockLevelOfDay = {
        _id: 'level999',
        name: 'Test Level',
        slug: 'user/test-level',
        userId: {
          name: 'testuser',
        },
      };

      getLevelOfDay.mockResolvedValue(mockLevelOfDay);
      getServerSidePropsFromLevel.mockResolvedValue({
        props: { level: mockLevelOfDay },
      });

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
      expect(getServerSidePropsFromLevel).toHaveBeenCalledWith({
        req: customReq,
        params: {
          username: 'testuser',
          slugName: 'test-level',
        },
      });
    });
  });
});
