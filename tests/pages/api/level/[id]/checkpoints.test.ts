import Direction from '@root/constants/direction';
import Role from '@root/constants/role';
import TestId from '@root/constants/testId';
import { directionsToGameState, isValidDirections } from '@root/helpers/checkpointHelpers';
import { areEqualGameStates } from '@root/helpers/gameStateHelpers';
import { BEST_CHECKPOINT_INDEX } from '@root/hooks/useCheckpoints';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { UserModel } from '@root/models/mongoose';
import handler from '@root/pages/api/level/[id]/checkpoints';
import { enableFetchMocks } from 'jest-fetch-mock';
import mongoose from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import gameStateFromDirections from './gameStateFromDirections';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async() => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
enableFetchMocks();

const DIRECTIONS_1 = [
  Direction.RIGHT,
  Direction.RIGHT,
  Direction.RIGHT,
  Direction.UP,
  Direction.UP,
  Direction.UP,
];

const DIRECTIONS_2 = [
  Direction.RIGHT,
  Direction.DOWN,
  Direction.RIGHT,
  Direction.RIGHT,
  Direction.UP,
  Direction.RIGHT,
];

async function query({ params, expectedError, expectedStatus, additionalAssertions }: {
    params: Partial<NextApiRequestWithAuth>,
    expectedError?: string,
    expectedStatus: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    additionalAssertions?: (response: any) => Promise<void>,
    }) {
  await testApiHandler({
    handler: async (_, res) => {
      const req: NextApiRequestWithAuth = {
        cookies: {
          token: getTokenCookieValue(TestId.USER)
        },
        headers: {
          'content-type': 'application/json',
        },
        ...params,
      } as unknown as NextApiRequestWithAuth;

      await handler(req, res);
    },
    test: async ({ fetch }) => {
      const res = await fetch();
      const response = await res.json();

      expect(response.error).toBe(expectedError);
      expect(res.status).toBe(expectedStatus);

      if (additionalAssertions) {
        await additionalAssertions(response);
      }
    },
  });
}

describe('api/user/[id]/checkpoints', () => {
  test('should return 401 if not pro subscriber', async () => {
    await query({
      params: {
        method: 'GET',
        query: {
          id: TestId.LEVEL,
        },
      },
      expectedError: 'Not authorized',
      expectedStatus: 401,
    });
  });
  test('should return OK if pro subscriber', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });
    await query({
      params: {
        method: 'GET',
        query: {
          id: TestId.LEVEL,
        },
      },
      expectedStatus: 200,
      additionalAssertions: async (response) => {
        expect(response).toStrictEqual(Array(11).fill(null));
      }
    });
  });
  test('try to save with invalid directions', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });
    await query({
      params: {
        method: 'POST',
        query: {
          id: new mongoose.Types.ObjectId().toString(),
        },
        body: {
          index: 0,
          directions: [1000],
        },
      },
      expectedStatus: 400,
      expectedError: 'Invalid body.directions',
    });
  });
  test('try to save with invalid directions (object)', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });
    await query({
      params: {
        method: 'POST',
        query: {
          id: new mongoose.Types.ObjectId().toString(),
        },
        body: {
          index: 0,
          directions: { invalid: true },
        },
      },
      expectedStatus: 400,
      expectedError: 'Invalid body.directions',
    });
  });
  test('try to save on level that does not exist', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });
    await query({
      params: {
        method: 'POST',
        query: {
          id: new mongoose.Types.ObjectId().toString(),
        },
        body: {
          index: 0,
          directions: DIRECTIONS_1,
        },
      },
      expectedStatus: 404,
      expectedError: 'Level not found',
    });
  });
  test('try to save on checkpoint index 0', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });
    await query({
      params: {
        method: 'POST',
        query: {
          id: TestId.LEVEL,
        },
        body: {
          index: 0,
          directions: DIRECTIONS_1,
        },
      },
      expectedStatus: 200,
      additionalAssertions: async (response) => {
        expect(response).toBeDefined();
        expect(response[0]).toStrictEqual(DIRECTIONS_1);
      }
    });
  });
  test('try to save on checkpoint index 1', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });
    await query({
      params: {
        method: 'POST',
        query: {
          id: TestId.LEVEL,
        },
        body: {
          index: 1,
          directions: DIRECTIONS_2,
        },
      },
      expectedStatus: 200,
      additionalAssertions: async (response) => {
        expect(response).toBeDefined();
        expect(response[0]).toStrictEqual(DIRECTIONS_1);
        expect(response[1]).toStrictEqual(DIRECTIONS_2);
      }
    });
  });
  test('try to delete checkpoint index 1', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });
    await query({
      params: {
        method: 'DELETE',
        query: {
          id: TestId.LEVEL,
          index: '1',
        },
      },
      expectedStatus: 200,
      additionalAssertions: async (response) => {
        expect(response).toBeDefined();
        expect(response[0]).toStrictEqual(DIRECTIONS_1);
      }
    });
  });
  test('save BEST_CHECKPOINT_INDEX', async () => {
    expect(DIRECTIONS_2.length).toBe(6);
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });
    await query({
      params: {
        method: 'POST',
        query: {
          id: TestId.LEVEL,
        },
        body: {
          index: BEST_CHECKPOINT_INDEX,
          directions: DIRECTIONS_2,
        },
      },
      expectedStatus: 200,
      additionalAssertions: async (response) => {
        expect(response).toBeDefined();
        expect(response[0]).toStrictEqual(DIRECTIONS_1);
        expect(response[1]).toBeUndefined();
        expect(response[10]).toStrictEqual(DIRECTIONS_2);
      }
    });
  });
  test('updating BEST_CHECKPOINT_INDEX to a higher move count should fail', async () => {
    const newDirections = [...DIRECTIONS_1];

    newDirections.push(Direction.LEFT);

    expect(DIRECTIONS_1.length).toBe(6);
    expect(newDirections.length).toBe(7);

    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });
    await query({
      params: {
        method: 'POST',
        query: {
          id: TestId.LEVEL,
        },
        body: {
          index: BEST_CHECKPOINT_INDEX,
          directions: newDirections,
        },
      },
      expectedStatus: 400,
      expectedError: 'Best checkpoint must have a lower move count',
    });
  });
  test('updating BEST_CHECKPOINT_INDEX to a lower move count should succeed', async () => {
    const newDirections = [...DIRECTIONS_1];

    newDirections.pop();

    expect(DIRECTIONS_1.length).toBe(6);
    expect(newDirections.length).toBe(5);

    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });
    await query({
      params: {
        method: 'POST',
        query: {
          id: TestId.LEVEL,
        },
        body: {
          index: BEST_CHECKPOINT_INDEX,
          directions: newDirections,
        },
      },
      expectedStatus: 200,
    });
  });
  test('should not be able to delete BEST_CHECKPOINT_INDEX', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });
    await query({
      params: {
        method: 'DELETE',
        query: {
          id: TestId.LEVEL,
          index: String(BEST_CHECKPOINT_INDEX),
        },
      },
      expectedStatus: 400,
      expectedError: 'Invalid query.index',
    });
  });
});

describe('checkpiontHelpers.ts', () => {
  test('isValidDirections', () => {
    expect(isValidDirections(undefined)).toBe(false);
    expect(isValidDirections('checkpoint')).toBe(false);
    expect(isValidDirections([1, 2, 3, 4, 3910191039])).toBe(false);
    expect(isValidDirections([1, 2, 3, 4])).toBe(true);
  });
  test('directionsToGameState', () => {
    expect(directionsToGameState(DIRECTIONS_1, '4000B0\n120000\n050000\n678900\nABCD30')).toBeNull();

    const gameState = directionsToGameState(DIRECTIONS_2, '4000B0\n120000\n050000\n678900\nABCD30');

    expect(gameState).toBeDefined();

    if (gameState) {
      expect(areEqualGameStates(gameState, gameStateFromDirections)).toBeTruthy();
    }
  });
});
