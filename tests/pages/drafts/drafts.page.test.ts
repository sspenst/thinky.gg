/* eslint-disable @typescript-eslint/no-explicit-any */
import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import { DEFAULT_GAME_ID } from '../../../constants/GameId';
import TestId from '../../../constants/testId';
import { logger } from '../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../lib/getTokenCookie';
import { LevelModel } from '../../../models/mongoose';
import { getServerSideProps } from '../../../pages/[subdomain]/drafts';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
//enableFetchMocks()

describe('pages/drafts page', () => {
  test('getServerProps with no params', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const context = {
    };

    const ret = await getServerSideProps(context as GetServerSidePropsContext) as any;

    expect(ret).toBeDefined();
    expect(ret.props).toBeUndefined();
    expect(ret.redirect).toBeDefined();
    expect(ret.redirect?.destination).toBe('/login');
  });
  test('getServerProps with params', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const context = {
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER),
        }
      },
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext) as any;

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.redirect).toBeUndefined();
  });

  test('getServerProps with pagination - default page 1', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const context = {
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER),
        }
      },
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext) as any;

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props.page).toBe(1);
    expect(ret.props.levelsPerPage).toBe(20);
    expect(ret.props.totalCount).toBeDefined();
    expect(ret.props.levels).toBeDefined();
    expect(Array.isArray(ret.props.levels)).toBe(true);
  });

  test('getServerProps with pagination - page 2', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const context = {
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER),
        }
      },
      query: {
        page: '2'
      }
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext) as any;

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props.page).toBe(2);
    expect(ret.props.levelsPerPage).toBe(20);
    expect(ret.props.totalCount).toBeDefined();
    expect(ret.props.levels).toBeDefined();
  });

  test('getServerProps with invalid page number', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const context = {
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER),
        }
      },
      query: {
        page: 'invalid'
      }
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext) as any;

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    // Should default to page 1 when page is invalid
    expect(ret.props.page).toBe(1);
  });

  test('getServerProps pagination limits levels correctly', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    // Create some test draft levels for pagination testing
    const testLevels = [];

    for (let i = 0; i < 25; i++) {
      testLevels.push({
        name: `Test Draft Level ${i}`,
        isDraft: true,
        isDeleted: false,
        userId: TestId.USER,
        gameId: DEFAULT_GAME_ID,
        data: '40000\n12000\n05000\n67890\nABCDE',
        height: 5,
        width: 5,
        leastMoves: 20,
        ts: Math.floor(Date.now() / 1000),
        slug: `test-draft-level-${i}`,
        isRanked: false,
      });
    }

    await LevelModel.insertMany(testLevels);

    try {
      // Test page 1
      const contextPage1 = {
        req: {
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          }
        },
        query: {
          page: '1'
        }
      };

      const retPage1 = await getServerSideProps(contextPage1 as unknown as GetServerSidePropsContext) as any;

      expect(retPage1.props.page).toBe(1);
      expect(retPage1.props.levels.length).toBeLessThanOrEqual(20);
      expect(retPage1.props.totalCount).toBeGreaterThanOrEqual(25);

      // Test page 2
      const contextPage2 = {
        req: {
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          }
        },
        query: {
          page: '2'
        }
      };

      const retPage2 = await getServerSideProps(contextPage2 as unknown as GetServerSidePropsContext) as any;

      expect(retPage2.props.page).toBe(2);
      expect(retPage2.props.levels.length).toBeLessThanOrEqual(20);

      // Test page 2 should have remaining levels
      const contextPage3 = {
        req: {
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          }
        },
        query: {
          page: '3'
        }
      };

      const retPage3 = await getServerSideProps(contextPage3 as unknown as GetServerSidePropsContext) as any;

      expect(retPage3.props.page).toBe(3);
      expect(retPage3.props.levels.length).toBeLessThanOrEqual(20);
    } finally {
      // Clean up test levels
      await LevelModel.deleteMany({
        name: { $regex: /^Test Draft Level \d+$/ }
      });
    }
  });

  test('getServerProps handles page beyond available data', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const context = {
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER),
        }
      },
      query: {
        page: '999'
      }
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext) as any;

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props.page).toBe(999);
    expect(ret.props.levels).toBeDefined();
    expect(Array.isArray(ret.props.levels)).toBe(true);
    // Should return empty array when page is beyond available data
    expect(ret.props.levels.length).toBe(0);
  });

  test('getServerProps returns correct pagination metadata', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const context = {
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER),
        }
      },
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext) as any;

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(typeof ret.props.page).toBe('number');
    expect(typeof ret.props.totalCount).toBe('number');
    expect(typeof ret.props.levelsPerPage).toBe('number');
    expect(ret.props.levelsPerPage).toBe(20);
    expect(ret.props.totalCount).toBeGreaterThanOrEqual(0);
    expect(ret.props.page).toBeGreaterThan(0);
    expect(typeof ret.props.search).toBe('string');
  });

  test('getServerProps with search parameter', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const context = {
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER),
        }
      },
      query: {
        search: 'test'
      }
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext) as any;

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props.search).toBe('test');
    expect(ret.props.levels).toBeDefined();
    expect(Array.isArray(ret.props.levels)).toBe(true);
  });

  test('getServerProps search functionality filters levels', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    // Create test draft levels with different names
    const testLevels = [
      {
        name: 'Searchable Unique Test Level',
        isDraft: true,
        isDeleted: false,
        userId: TestId.USER,
        gameId: DEFAULT_GAME_ID,
        data: '40000\n12000\n05000\n67890\nABCDE',
        height: 5,
        width: 5,
        leastMoves: 20,
        ts: Math.floor(Date.now() / 1000),
        slug: 'searchable-unique-test-level',
        isRanked: false,
      },
      {
        name: 'Another Findable Draft',
        isDraft: true,
        isDeleted: false,
        userId: TestId.USER,
        gameId: DEFAULT_GAME_ID,
        data: '40000\n12000\n05000\n67890\nABCDE',
        height: 5,
        width: 5,
        leastMoves: 20,
        ts: Math.floor(Date.now() / 1000),
        slug: 'another-findable-draft',
        isRanked: false,
      },
      {
        name: 'Completely Different Name',
        isDraft: true,
        isDeleted: false,
        userId: TestId.USER,
        gameId: DEFAULT_GAME_ID,
        data: '40000\n12000\n05000\n67890\nABCDE',
        height: 5,
        width: 5,
        leastMoves: 20,
        ts: Math.floor(Date.now() / 1000),
        slug: 'completely-different-name',
        isRanked: false,
      }
    ];

    await LevelModel.insertMany(testLevels);

    try {
      // Test search for "searchable" should find "Searchable Unique Test Level"
      const contextSearch = {
        req: {
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          }
        },
        query: {
          search: 'searchable'
        }
      };

      const retSearch = await getServerSideProps(contextSearch as unknown as GetServerSidePropsContext) as any;

      expect(retSearch.props.search).toBe('searchable');
      expect(retSearch.props.levels.length).toBe(1);
      expect(retSearch.props.levels[0].name).toBe('Searchable Unique Test Level');
      expect(retSearch.props.totalCount).toBe(1);

      // Test search for "findable" should find "Another Findable Draft"
      const contextFindable = {
        req: {
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          }
        },
        query: {
          search: 'findable'
        }
      };

      const retFindable = await getServerSideProps(contextFindable as unknown as GetServerSidePropsContext) as any;

      expect(retFindable.props.search).toBe('findable');
      expect(retFindable.props.levels.length).toBe(1);
      expect(retFindable.props.levels[0].name).toBe('Another Findable Draft');

      // Test search for "completely" should find "Completely Different Name"
      const contextCompletely = {
        req: {
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          }
        },
        query: {
          search: 'completely'
        }
      };

      const retCompletely = await getServerSideProps(contextCompletely as unknown as GetServerSidePropsContext) as any;

      expect(retCompletely.props.search).toBe('completely');
      expect(retCompletely.props.levels.length).toBe(1);
      expect(retCompletely.props.levels[0].name).toBe('Completely Different Name');
      expect(retCompletely.props.totalCount).toBe(1);
    } finally {
      // Clean up test levels
      await LevelModel.deleteMany({
        name: { $in: ['Searchable Unique Test Level', 'Another Findable Draft', 'Completely Different Name'] }
      });
    }
  });

  test('getServerProps search with no results', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const context = {
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER),
        }
      },
      query: {
        search: 'nonexistent'
      }
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext) as any;

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props.search).toBe('nonexistent');
    expect(ret.props.levels).toBeDefined();
    expect(ret.props.levels.length).toBe(0);
    expect(ret.props.totalCount).toBe(0);
  });

  test('getServerProps search is case insensitive', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    // Create test draft level
    const testLevel = {
      name: 'CaseSensitive Test Level',
      isDraft: true,
      isDeleted: false,
      userId: TestId.USER,
      gameId: DEFAULT_GAME_ID,
      data: '40000\n12000\n05000\n67890\nABCDE',
      height: 5,
      width: 5,
      leastMoves: 20,
      ts: Math.floor(Date.now() / 1000),
      slug: 'casesensitive-test-level',
      isRanked: false,
    };

    await LevelModel.create(testLevel);

    try {
      // Test lowercase search
      const contextLower = {
        req: {
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          }
        },
        query: {
          search: 'casesensitive'
        }
      };

      const retLower = await getServerSideProps(contextLower as unknown as GetServerSidePropsContext) as any;

      expect(retLower.props.levels.length).toBe(1);
      expect(retLower.props.levels[0].name).toBe('CaseSensitive Test Level');

      // Test uppercase search
      const contextUpper = {
        req: {
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          }
        },
        query: {
          search: 'CASESENSITIVE'
        }
      };

      const retUpper = await getServerSideProps(contextUpper as unknown as GetServerSidePropsContext) as any;

      expect(retUpper.props.levels.length).toBe(1);
      expect(retUpper.props.levels[0].name).toBe('CaseSensitive Test Level');
    } finally {
      // Clean up test level
      await LevelModel.deleteOne({
        name: 'CaseSensitive Test Level'
      });
    }
  });

  test('getServerProps search with pagination', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    // Create multiple test levels that match search
    const testLevels = [];

    for (let i = 0; i < 25; i++) {
      testLevels.push({
        name: `Searchable Level ${i}`,
        isDraft: true,
        isDeleted: false,
        userId: TestId.USER,
        gameId: DEFAULT_GAME_ID,
        data: '40000\n12000\n05000\n67890\nABCDE',
        height: 5,
        width: 5,
        leastMoves: 20,
        ts: Math.floor(Date.now() / 1000) + i, // Different timestamps for consistent sorting
        slug: `searchable-level-${i}`,
        isRanked: false,
      });
    }

    await LevelModel.insertMany(testLevels);

    try {
      // Test page 1 with search
      const contextPage1 = {
        req: {
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          }
        },
        query: {
          search: 'searchable',
          page: '1'
        }
      };

      const retPage1 = await getServerSideProps(contextPage1 as unknown as GetServerSidePropsContext) as any;

      expect(retPage1.props.search).toBe('searchable');
      expect(retPage1.props.page).toBe(1);
      expect(retPage1.props.levels.length).toBeLessThanOrEqual(20);
      expect(retPage1.props.totalCount).toBe(25);

      // Test page 2 with search
      const contextPage2 = {
        req: {
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          }
        },
        query: {
          search: 'searchable',
          page: '2'
        }
      };

      const retPage2 = await getServerSideProps(contextPage2 as unknown as GetServerSidePropsContext) as any;

      expect(retPage2.props.search).toBe('searchable');
      expect(retPage2.props.page).toBe(2);
      expect(retPage2.props.levels.length).toBeLessThanOrEqual(20);
      expect(retPage2.props.totalCount).toBe(25);
    } finally {
      // Clean up test levels
      await LevelModel.deleteMany({
        name: { $regex: /^Searchable Level \d+$/ }
      });
    }
  });
});
