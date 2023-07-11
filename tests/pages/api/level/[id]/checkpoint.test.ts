import Role from '@root/constants/role';
import TestId from '@root/constants/testId';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { UserModel } from '@root/models/mongoose';
import handler from '@root/pages/api/level/[id]/checkpoints';
import { enableFetchMocks } from 'jest-fetch-mock';
import mongoose from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';

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
const GAME_STATE_1 = { 'actionCount': 6, 'blocks': [{ 'id': 0, 'pos': { 'x': 1, 'y': 1 }, 'type': '6', 'inHole': false }, { 'id': 1, 'pos': { 'x': 5, 'y': 1 }, 'type': '8', 'inHole': false }, { 'id': 2, 'pos': { 'x': 1, 'y': 2 }, 'type': 'H', 'inHole': false }, { 'id': 3, 'pos': { 'x': 3, 'y': 2 }, 'type': 'C', 'inHole': false }, { 'id': 4, 'pos': { 'x': 5, 'y': 2 }, 'type': '6', 'inHole': false }, { 'id': 5, 'pos': { 'x': 1, 'y': 3 }, 'type': 'F', 'inHole': false }, { 'id': 6, 'pos': { 'x': 5, 'y': 3 }, 'type': 'E', 'inHole': false }, { 'id': 7, 'pos': { 'x': 1, 'y': 4 }, 'type': 'I', 'inHole': false }, { 'id': 8, 'pos': { 'x': 3, 'y': 4 }, 'type': 'A', 'inHole': false }, { 'id': 9, 'pos': { 'x': 5, 'y': 4 }, 'type': 'I', 'inHole': false }, { 'id': 10, 'pos': { 'x': 1, 'y': 5 }, 'type': '2', 'inHole': false }, { 'id': 11, 'pos': { 'x': 5, 'y': 5 }, 'type': '2', 'inHole': false }], 'board': [[{ 'levelDataType': '1', 'text': [] }, { 'levelDataType': '1', 'text': [] }, { 'levelDataType': '1', 'text': [] }, { 'levelDataType': '3', 'text': [] }, { 'levelDataType': '1', 'text': [] }, { 'levelDataType': '1', 'text': [] }, { 'levelDataType': '1', 'text': [] }], [{ 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [] }], [{ 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [] }], [{ 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [] }], [{ 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [5] }], [{ 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [4] }], [{ 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [0] }, { 'levelDataType': '0', 'text': [1] }, { 'levelDataType': '0', 'text': [2] }, { 'levelDataType': '0', 'text': [3] }]], 'height': 7, 'moveCount': 6, 'moves': [{ 'code': 'ArrowRight', 'pos': { 'x': 3, 'y': 6 } }, { 'code': 'ArrowRight', 'pos': { 'x': 4, 'y': 6 } }, { 'code': 'ArrowRight', 'pos': { 'x': 5, 'y': 6 } }, { 'code': 'ArrowUp', 'pos': { 'x': 6, 'y': 6 } }, { 'code': 'ArrowUp', 'pos': { 'x': 6, 'y': 5 } }, { 'code': 'ArrowUp', 'pos': { 'x': 6, 'y': 4 } }], 'pos': { 'x': 6, 'y': 3 }, 'width': 7 };
const GAME_STATE_2 = { 'actionCount': 26, 'blocks': [{ 'id': 0, 'pos': { 'x': 1, 'y': 1 }, 'type': '6', 'inHole': false }, { 'id': 1, 'pos': { 'x': 5, 'y': 1 }, 'type': '8', 'inHole': false }, { 'id': 2, 'pos': { 'x': 1, 'y': 2 }, 'type': 'H', 'inHole': false }, { 'id': 3, 'pos': { 'x': 3, 'y': 2 }, 'type': 'C', 'inHole': false }, { 'id': 4, 'pos': { 'x': 5, 'y': 2 }, 'type': '6', 'inHole': false }, { 'id': 5, 'pos': { 'x': 1, 'y': 3 }, 'type': 'F', 'inHole': false }, { 'id': 6, 'pos': { 'x': 5, 'y': 3 }, 'type': 'E', 'inHole': false }, { 'id': 7, 'pos': { 'x': 1, 'y': 4 }, 'type': 'I', 'inHole': false }, { 'id': 8, 'pos': { 'x': 3, 'y': 4 }, 'type': 'A', 'inHole': false }, { 'id': 9, 'pos': { 'x': 5, 'y': 4 }, 'type': 'I', 'inHole': false }, { 'id': 10, 'pos': { 'x': 1, 'y': 5 }, 'type': '2', 'inHole': false }, { 'id': 11, 'pos': { 'x': 5, 'y': 5 }, 'type': '2', 'inHole': false }], 'board': [[{ 'levelDataType': '1', 'text': [] }, { 'levelDataType': '1', 'text': [] }, { 'levelDataType': '1', 'text': [] }, { 'levelDataType': '3', 'text': [] }, { 'levelDataType': '1', 'text': [] }, { 'levelDataType': '1', 'text': [] }, { 'levelDataType': '1', 'text': [] }], [{ 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [] }], [{ 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [] }], [{ 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [] }], [{ 'levelDataType': '0', 'text': [5] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [] }], [{ 'levelDataType': '0', 'text': [4] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '5', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [] }], [{ 'levelDataType': '0', 'text': [3] }, { 'levelDataType': '0', 'text': [2] }, { 'levelDataType': '0', 'text': [1] }, { 'levelDataType': '0', 'text': [0] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [] }, { 'levelDataType': '0', 'text': [] }]], 'height': 7, 'moveCount': 6, 'moves': [{ 'code': 'ArrowLeft', 'pos': { 'x': 3, 'y': 6 } }, { 'code': 'ArrowLeft', 'pos': { 'x': 2, 'y': 6 } }, { 'code': 'ArrowLeft', 'pos': { 'x': 1, 'y': 6 } }, { 'code': 'ArrowUp', 'pos': { 'x': 0, 'y': 6 } }, { 'code': 'ArrowUp', 'pos': { 'x': 0, 'y': 5 } }, { 'code': 'ArrowUp', 'pos': { 'x': 0, 'y': 4 } }], 'pos': { 'x': 0, 'y': 3 }, 'width': 7 };

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
  test('try to save with an invalid gamestate', async () => {
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
          checkpointIndex: 0,
          checkpointValue: { gameState: GAME_STATE_1 },
        },
      },
      expectedStatus: 400,
      expectedError: 'Invalid body.checkpointValue',
    });
  });
  test('try to save with an invalid gamestate (extra fields)', async () => {
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
          checkpointIndex: 0,
          checkpointValue: { ...GAME_STATE_1, ...{ 'otherkey': 'blah' } },
        },
      },
      expectedStatus: 400,
      expectedError: 'Invalid body.checkpointValue',
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
          checkpointIndex: 0,
          checkpointValue: GAME_STATE_1,
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
          checkpointIndex: 0,
          checkpointValue: GAME_STATE_1,
        },
      },
      expectedStatus: 200,
      additionalAssertions: async (response) => {
        expect(response).toBeDefined();
        expect(response[0]).toStrictEqual(GAME_STATE_1);
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
          checkpointIndex: 1,
          checkpointValue: GAME_STATE_2,
        },
      },
      expectedStatus: 200,
      additionalAssertions: async (response) => {
        expect(response).toBeDefined();
        expect(response[0]).toStrictEqual(GAME_STATE_1);
        expect(response[1]).toStrictEqual(GAME_STATE_2);
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
        },
        body: {
          checkpointIndex: 1,
          checkpointValue: GAME_STATE_2,
        },
      },
      expectedStatus: 200,
      additionalAssertions: async (response) => {
        expect(response).toBeDefined();
        expect(response[0]).toStrictEqual(GAME_STATE_1);
      }
    });
  });
});
