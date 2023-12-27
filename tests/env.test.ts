import { NextApiRequest } from 'next';
import cookieOptions from '../lib/cookieOptions';
import { getTokenCookieValue } from '../lib/getTokenCookie';
import { getUserFromToken } from '../lib/withAuth';

// https://stackoverflow.com/questions/48033841/test-process-env-with-jest
const OLD_ENV = process.env;

afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  //await dbDisconnect();
});
beforeAll(async () => {
  // await dbConnect();
});
beforeEach(() => {
  jest.resetModules(); // Most important - it clears the cache
  process.env = { ...OLD_ENV }; // Make a copy
});

afterAll(() => {
  process.env = OLD_ENV; // Restore old environment
});

describe('pages/api/level/index.ts', () => {
  test('process.env', () => {
    expect(process.env).toBeDefined();
    expect(process.env.LOCAL).toBe('true');
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.REVALIDATE_SECRET).toBe('whatever');
  });

  test('getTokenCookieValue', () => {
    process.env.JWT_SECRET = undefined;
    expect(() => getTokenCookieValue('')).toThrow('JWT_SECRET not defined');
  });

  test('getUserFromToken', async () => {
    process.env.JWT_SECRET = undefined;
    await expect(getUserFromToken(undefined, {} as NextApiRequest)).rejects.toThrow('token not defined');
    await expect(getUserFromToken('invalid', {} as NextApiRequest)).rejects.toThrow('JWT_SECRET not defined');
  });

  test('cookieOptions', async () => {
    process.env.LOCAL = undefined;
    expect(cookieOptions('host').domain).toBe('.host');
    expect(cookieOptions(undefined).domain).toBe('.thinky.gg');
  });
});

export { };
