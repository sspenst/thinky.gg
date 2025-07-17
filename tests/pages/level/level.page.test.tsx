import Role from '@root/constants/role';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { UserModel } from '@root/models/mongoose';
import { GetServerSidePropsContext } from 'next';
import TestId from '../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getServerSideProps } from '../../../pages/[subdomain]/level/[username]/[slugName]';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});

describe('Level.tsx page by slug', () => {
  it('should render the level page with basic params', async () => {
    // Created from initialize db file
    const params = { username: 'test', slugName: 'test-level-1' } as unknown;
    const context = {
      params: params,
    };
    const ret = await getServerSideProps(context as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props?._level).not.toBeNull();
    expect(ret.props?._level?._id).toBe(TestId.LEVEL);
  });
});
it('should redirect if user is a bot', async () => {
  const params = { username: 'test', slugName: 'test-level-1' } as unknown;

  // update USER_B, add bot role
  await UserModel.findByIdAndUpdate(TestId.USER_B, { roles: [Role.BOT] });
  const context = {
    params: params,
    req: {
      cookies: {
        token: getTokenCookieValue(TestId.USER_B),
      }
    }
  };
  const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

  expect(ret).toBeDefined();

  expect(ret.redirect).toBeDefined();
  expect(ret.redirect?.destination).toBe('/?redirect_type=bot-not-allowed');
  expect(ret.redirect?.permanent).toBe(false);
});

export { };
