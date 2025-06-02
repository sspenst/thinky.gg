import { DEFAULT_GAME_ID, GameId } from '@root/constants/GameId';
import TestId from '@root/constants/testId';
import { logger } from '@root/helpers/logger';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { Types } from 'mongoose';
import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import { getServerSideProps } from '../../../../pages/[subdomain]/edit/collection/[id]';
import * as collectionById from '../../../../pages/api/collection-by-id/[id]';

// Mock the getCollection function
jest.mock('../../../../pages/api/collection-by-id/[id]', () => ({
  getCollection: jest.fn(),
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

describe('pages/[subdomain]/edit/collection/[id]', () => {
  const mockReq = {
    headers: {
      host: 'localhost:3000',
    },
  };

  describe('getServerSideProps', () => {
    test('HAPPY PATH: Authenticated user editing their own collection', async () => {
      const mockGetCollection = collectionById.getCollection as jest.MockedFunction<typeof collectionById.getCollection>;

      // Mock a collection with levels
      const mockCollection = {
        _id: new Types.ObjectId(),
        name: 'My Test Collection',
        slug: 'my-test-collection',
        userId: new Types.ObjectId(TestId.USER),
        gameId: DEFAULT_GAME_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
        levels: [
          {
            _id: new Types.ObjectId(),
            name: 'Level 1',
            slug: 'level-1',
            isDraft: false,
            leastMoves: 10,
            userMoves: 12,
            userId: { name: 'author1' },
          },
          {
            _id: new Types.ObjectId(),
            name: 'Level 2',
            slug: 'level-2',
            isDraft: true,
            leastMoves: 15,
            userMoves: null,
            userId: { name: 'author2' },
          },
        ],
      } as any;

      mockGetCollection.mockResolvedValue(mockCollection);

      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        query: {
          id: mockCollection._id.toString(),
        },
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');

      // Check that collection data was serialized properly
      expect((result as any).props.collection._id).toBe(mockCollection._id.toString());
      expect((result as any).props.collection.name).toBe(mockCollection.name);
      expect((result as any).props.collection.slug).toBe(mockCollection.slug);
      expect((result as any).props.collection.userId).toBe(mockCollection.userId.toString());
      expect((result as any).props.collection.levels).toHaveLength(2);

      expect((result as any).props.reqUser).toBeDefined();
      expect((result as any).props.reqUser._id.toString()).toBe(TestId.USER);

      // Verify getCollection was called with correct parameters
      expect(mockGetCollection).toHaveBeenCalledWith({
        includeDraft: true,
        matchQuery: {
          _id: new Types.ObjectId(mockCollection._id.toString()),
          userId: expect.any(Types.ObjectId),
          gameId: DEFAULT_GAME_ID,
        },
        reqUser: expect.any(Object),
      });
    });

    test('getServerSideProps with no token should redirect to login', async () => {
      const context = {
        req: mockReq,
        query: {
          id: new Types.ObjectId().toString(),
        },
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: '/login',
          permanent: false,
        },
      });
    });

    test('getServerSideProps with invalid token should redirect to login', async () => {
      jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: 'invalid-token',
          },
        },
        query: {
          id: new Types.ObjectId().toString(),
        },
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: '/login',
          permanent: false,
        },
      });
    });

    test('getServerSideProps with missing id parameter should redirect to login', async () => {
      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        query: {
          // Missing id parameter
        },
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: '/login',
          permanent: false,
        },
      });
    });

    test('getServerSideProps with array id parameter should redirect to login', async () => {
      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        query: {
          id: ['id1', 'id2'], // Array instead of string
        },
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: '/login',
          permanent: false,
        },
      });
    });

    test('getServerSideProps with collection not found should return 404', async () => {
      const mockGetCollection = collectionById.getCollection as jest.MockedFunction<typeof collectionById.getCollection>;

      mockGetCollection.mockResolvedValue(null); // Collection not found

      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        query: {
          id: new Types.ObjectId().toString(),
        },
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        notFound: true,
      });
    });

    test('getServerSideProps should handle collection with empty levels array', async () => {
      const mockGetCollection = collectionById.getCollection as jest.MockedFunction<typeof collectionById.getCollection>;

      const mockCollection = {
        _id: new Types.ObjectId(),
        name: 'Empty Collection',
        slug: 'empty-collection',
        userId: new Types.ObjectId(TestId.USER),
        gameId: DEFAULT_GAME_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
        levels: [], // Empty levels array
      } as any;

      mockGetCollection.mockResolvedValue(mockCollection);

      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        query: {
          id: mockCollection._id.toString(),
        },
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');
      expect((result as any).props.collection.levels).toEqual([]);
    });

    test('getServerSideProps should include draft levels in collection query', async () => {
      const mockGetCollection = collectionById.getCollection as jest.MockedFunction<typeof collectionById.getCollection>;

      const mockCollection = {
        _id: new Types.ObjectId(),
        name: 'Collection with Drafts',
        slug: 'collection-with-drafts',
        userId: new Types.ObjectId(TestId.USER),
        gameId: DEFAULT_GAME_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
        levels: [
          {
            _id: new Types.ObjectId(),
            name: 'Published Level',
            isDraft: false,
            userId: { name: 'author1' },
          },
          {
            _id: new Types.ObjectId(),
            name: 'Draft Level',
            isDraft: true,
            userId: { name: 'author2' },
          },
        ],
      } as any;

      mockGetCollection.mockResolvedValue(mockCollection);

      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        query: {
          id: mockCollection._id.toString(),
        },
      };

      await getServerSideProps(context as unknown as GetServerSidePropsContext);

      // Verify that includeDraft: true was passed to getCollection
      expect(mockGetCollection).toHaveBeenCalledWith(
        expect.objectContaining({
          includeDraft: true,
        })
      );
    });

    test('getServerSideProps should filter by userId to ensure user owns collection', async () => {
      const mockGetCollection = collectionById.getCollection as jest.MockedFunction<typeof collectionById.getCollection>;

      mockGetCollection.mockResolvedValue(null); // Simulates collection not found due to userId mismatch

      const collectionId = new Types.ObjectId();
      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        query: {
          id: collectionId.toString(),
        },
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      // Should return 404 when user doesn't own the collection
      expect(result).toEqual({
        notFound: true,
      });

      // Verify the query included userId filter
      expect(mockGetCollection).toHaveBeenCalledWith({
        includeDraft: true,
        matchQuery: {
          _id: collectionId,
          userId: expect.any(Types.ObjectId),
          gameId: DEFAULT_GAME_ID,
        },
        reqUser: expect.any(Object),
      });
    });

    test('getServerSideProps should filter by gameId', async () => {
      const mockGetCollection = collectionById.getCollection as jest.MockedFunction<typeof collectionById.getCollection>;

      const mockCollection = {
        _id: new Types.ObjectId(),
        name: 'Game-specific Collection',
        userId: new Types.ObjectId(TestId.USER),
        gameId: DEFAULT_GAME_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
        levels: [],
      } as any;

      mockGetCollection.mockResolvedValue(mockCollection);

      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        query: {
          id: mockCollection._id.toString(),
        },
      };

      await getServerSideProps(context as unknown as GetServerSidePropsContext);

      // Verify gameId filter was applied
      expect(mockGetCollection).toHaveBeenCalledWith(
        expect.objectContaining({
          matchQuery: expect.objectContaining({
            gameId: DEFAULT_GAME_ID,
          }),
        })
      );
    });

    test('getServerSideProps should handle different game subdomains', async () => {
      const mockGetCollection = collectionById.getCollection as jest.MockedFunction<typeof collectionById.getCollection>;

      const mockCollection = {
        _id: new Types.ObjectId(),
        name: 'Sokoban Collection',
        userId: new Types.ObjectId(TestId.USER),
        gameId: GameId.SOKOPATH,
        createdAt: new Date(),
        updatedAt: new Date(),
        levels: [],
      } as any;

      mockGetCollection.mockResolvedValue(mockCollection);

      const context = {
        req: {
          headers: {
            host: 'sokopath.localhost:3000', // Different game subdomain
          },
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        query: {
          id: mockCollection._id.toString(),
        },
      };

      await getServerSideProps(context as unknown as GetServerSidePropsContext);

      // Should use the game ID from the subdomain
      expect(mockGetCollection).toHaveBeenCalledWith(
        expect.objectContaining({
          matchQuery: expect.objectContaining({
            gameId: GameId.SOKOPATH,
          }),
        })
      );
    });

    test('getServerSideProps should serialize data correctly', async () => {
      const mockGetCollection = collectionById.getCollection as jest.MockedFunction<typeof collectionById.getCollection>;

      const mockCollection = {
        _id: new Types.ObjectId(),
        name: 'Serialization Test Collection',
        userId: new Types.ObjectId(TestId.USER),
        gameId: DEFAULT_GAME_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
        levels: [
          {
            _id: new Types.ObjectId(),
            name: 'Test Level',
            createdAt: new Date(),
            userId: {
              _id: new Types.ObjectId(),
              name: 'author',
              createdAt: new Date(),
            },
          },
        ],
      } as any;

      mockGetCollection.mockResolvedValue(mockCollection);

      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        query: {
          id: mockCollection._id.toString(),
        },
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      // Data should be properly serialized (no MongoDB ObjectIds in final props)
      expect(result).toHaveProperty('props');
      expect(typeof (result as any).props.collection._id).toBe('string');
      expect(typeof (result as any).props.reqUser._id).toBe('string');

      // Check that nested level data is also serialized
      if ((result as any).props.collection.levels.length > 0) {
        expect(typeof (result as any).props.collection.levels[0]._id).toBe('string');
        expect(typeof (result as any).props.collection.levels[0].userId._id).toBe('string');
      }
    });

    test('getServerSideProps should handle database errors gracefully', async () => {
      const mockGetCollection = collectionById.getCollection as jest.MockedFunction<typeof collectionById.getCollection>;

      // Mock getCollection to throw an error
      mockGetCollection.mockRejectedValue(new Error('Database connection error'));

      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        query: {
          id: new Types.ObjectId().toString(),
        },
      };

      // Should throw the error since the implementation doesn't catch it
      await expect(getServerSideProps(context as unknown as GetServerSidePropsContext))
        .rejects.toThrow('Database connection error');
    });
  });
});
