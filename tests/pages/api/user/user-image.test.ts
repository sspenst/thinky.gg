import { enableFetchMocks } from 'jest-fetch-mock';
import { Magic } from 'mmmagic';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import imageHandler from '../../../../pages/api/user/image';

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
const DefaultReq = {
  method: 'PUT',
  cookies: {
    token: getTokenCookieValue(TestId.USER),
  },
  headers: {
    'content-type': 'application/json',
  },
};
const convertToBinary = (base64: string) => {
  const matches = base64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);

  if (matches?.length !== 3) {
    return new Error('Invalid input string');
  }

  return Buffer.from(matches[2], 'base64');
};

describe('Testing image generation for user', () => {
  test('Wrong HTTP method should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          method: 'PATCH',
        } as unknown as NextApiRequestWithAuth;

        await imageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Unauthenticated should 401', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
        } as unknown as NextApiRequestWithAuth;

        await imageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Unauthorized: No token provided');
        expect(res.status).toBe(401);
      },
    });
  });
  test('Missing body and query', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          method: 'PUT',
        } as unknown as NextApiRequestWithAuth;

        await imageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Missing required parameters');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Missing query', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          method: 'PUT',
          body: {

          }
        } as unknown as NextApiRequestWithAuth;

        await imageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Missing required parameters');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Missing length field', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          method: 'PUT',
          body: {

          },
          query: {

          }
        } as unknown as NextApiRequestWithAuth;

        await imageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Missing required parameters');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Adding length field to body but this aint a buffer', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          method: 'PUT',
          body: {
            length: 123
          },
          query: {

          }
        } as unknown as NextApiRequestWithAuth;

        await imageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid file type');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Trying random data too big', async () => {
    const strTooBig = 'a'.repeat(2 * 1024 * 1024 + 1);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          method: 'PUT',
          body: strTooBig,
          query: {

          }
        } as unknown as NextApiRequestWithAuth;

        await imageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Image size must be less than 2MB');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Trying random string', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          method: 'PUT',
          body: '123456789',
          query: {

          }
        } as unknown as NextApiRequestWithAuth;

        await imageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid file type');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Trying random buffer', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          method: 'PUT',
          body: Buffer.from('123456789'),
          query: {

          }
        } as unknown as NextApiRequestWithAuth;

        await imageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid file type');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Mock when Magic.Detect gives error', async () => {
    const validImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbtEAAAAASUVORK5CYII';

    /**
     * const m = new Magic()
     * m.detect()
     * We need to mock this function to return an error
     */
    jest.spyOn(logger, 'error').mockImplementation(() => {return;}); // hide errors for logging here
    jest.spyOn(Magic.prototype, 'detect').mockImplementation((data, cb: (err: Error, mime: string) => void) => {
      cb(new Error('Mocked error'), 'image/png');
    });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          method: 'PUT',
          body: convertToBinary(validImage),
          headers: {
            'Content-Type': 'image/png',
          },

        } as unknown as NextApiRequestWithAuth;

        await imageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error inspecting file');
        expect(res.status).toBe(500);
      },
    });
  }, 5000);
  test('Trying base64 of an partly finished png', async () => {
    const sampleIconBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAGWSURBVHjaYvz//z8DJQAggJiQOe/fv2fv7Oz8rays/N+VkfG/iYnJfyD/1+rVq7ffu3dPFpsBAAHEAHIBCJ85c8bN2Nj4vwsDw/8zQLwKiO8CcRoQu0DxqlWrdsHUwzBAAIGADsBICPQ/uwcQAAAABJRU5ErkJggg==';
    //    const sampleIconBase64 = 'data:image/png;base64,2iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbtEAAAAASUVORK5CYII';

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          method: 'PUT',
          body: convertToBinary(sampleIconBase64),
          headers: {
            'Content-Type': 'image/png',
          },

        } as unknown as NextApiRequestWithAuth;

        await imageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error updating image');
        expect(res.status).toBe(500);
      },
    });
  }, 5000);
  test('Trying valid base64 image', async () => {
    const sampleIconBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbtEAAAAASUVORK5CYII';

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          method: 'PUT',
          body: convertToBinary(sampleIconBase64),
          headers: {
            'Content-Type': 'image/png',
          },

        } as unknown as NextApiRequestWithAuth;

        await imageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.updated).toBe(true);
      },
    });
  }, 5000);
});
