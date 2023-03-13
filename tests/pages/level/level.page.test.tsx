import { GetServerSidePropsContext } from 'next';
import TestId from '../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getServerSideProps } from '../../../pages/level/[username]/[slugName]';

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
export {};
