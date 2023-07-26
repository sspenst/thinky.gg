import Direction from '@root/constants/direction';
import Role from '@root/constants/role';
import TestId from '@root/constants/testId';
import { checkpointToGameState, gameStateToCheckpoint, isValidCheckpointState, isValidDirections } from '@root/helpers/checkpointHelpers';
import { cloneGameState } from '@root/helpers/gameStateHelpers';
import { BEST_CHECKPOINT_INDEX } from '@root/hooks/useCheckpoints';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { UserModel } from '@root/models/mongoose';
import handler from '@root/pages/api/level/[id]/checkpoints';
import { enableFetchMocks } from 'jest-fetch-mock';
import mongoose from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import CHECKPOINT_STATE_1 from './checkpointState1';
import CHECKPOINT_STATE_2 from './checkpointState2';

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
  test('try to save with an invalid CheckpointState', async () => {
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
          directions: CHECKPOINT_STATE_1,
        },
      },
      expectedStatus: 400,
      expectedError: 'Invalid body.directions',
    });
  });
  test('try to save with an invalid CheckpointState (extra fields)', async () => {
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
          directions: [5],
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
    expect(CHECKPOINT_STATE_2.moveCount).toBe(6);
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
  test('convert to gameState and back', () => {
    const gameState1 = checkpointToGameState(CHECKPOINT_STATE_1, '');

    expect(gameState1).toBeDefined();

    if (gameState1) {
      const checkpointState1 = gameStateToCheckpoint(gameState1);

      expect(JSON.stringify(checkpointState1)).toEqual(JSON.stringify(DIRECTIONS_1));
    }

    const gameState2 = checkpointToGameState(CHECKPOINT_STATE_2, '');

    expect(gameState2).toBeDefined();

    if (gameState2) {
      const checkpointState2 = gameStateToCheckpoint(gameState2);

      expect(JSON.stringify(checkpointState2)).toEqual(JSON.stringify(DIRECTIONS_2));
    }

    const gameState3 = checkpointToGameState(DIRECTIONS_2, '4000B0\n120000\n050000\n678900\nABCD30');

    // new directions produces same game state as old checkpointstate
    expect(JSON.stringify(gameState3)).toEqual(JSON.stringify(gameState2));

    if (gameState3) {
      expect(JSON.stringify(gameStateToCheckpoint(gameState3))).toEqual(JSON.stringify(DIRECTIONS_2));
      expect(JSON.stringify(cloneGameState(gameState3))).toEqual(JSON.stringify(gameState3));
    }
  });
  test('isValidCheckpointState', () => {
    expect(isValidCheckpointState(undefined)).toBe(false);
    expect(isValidCheckpointState('checkpoint')).toBe(false);
    expect(isValidCheckpointState([1, 2, 3, 4])).toBe(true);
    expect(isValidCheckpointState([1, 2, 3, 4, 5])).toBe(false);
    expect(isValidCheckpointState(CHECKPOINT_STATE_1)).toBe(true);
    expect(isValidCheckpointState(CHECKPOINT_STATE_2)).toBe(true);

    expect(isValidDirections(CHECKPOINT_STATE_1)).toBe(false);
  });
});
