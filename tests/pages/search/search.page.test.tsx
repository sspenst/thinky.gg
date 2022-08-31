import { GetServerSidePropsContext } from 'next';
import TestId from '../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../lib/getTokenCookie';
import { LevelModel } from '../../../models/mongoose';
import { getServerSideProps } from '../../../pages/search/index';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
//enableFetchMocks()

describe('pages/search page', () => {
  it('getServerSideProps should render the search page with no params', async () => {
    // Created from initialize db file
    const context = {
      query: {

      }
    };
    const ret = await getServerSideProps(context as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props.enrichedLevels).toHaveLength(2);
    expect(ret.props.enrichedLevels[0].name).toBe('test level 1');
    expect(ret.props.reqUser).toBeNull();
  });
  it('getServerSideProps with logged in user should return props ok', async () => {
    // Created from initialize db file
    const context = {
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER)
        }

      },
      query: {

      }
    };
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props.enrichedLevels).toHaveLength(2);
    expect(ret.props.enrichedLevels[0].name).toBe('test level 1');

    expect(ret.props.reqUser).toBeDefined();
    expect(ret.props.reqUser._id).toBe(TestId.USER);
  });
  it('getServerSideProps should return props with no results when searching for name that doesnt exist', async () => {
    // Created from initialize db file
    const context = {
      query: {
        search: 'AAAA'
      }
    };
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props.enrichedLevels).toHaveLength(0);
  });
  test('getServerSideProps with a db error should fail', async () => {
    jest.spyOn(LevelModel, 'find').mockReturnValueOnce({
      populate: () => {
        return {
          sort: () => {return null;}
        };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // expect this to error
    await expect(getServerSideProps({ query: { } } as unknown as GetServerSidePropsContext)).rejects.toThrow('Error querying Levels');
  });
});
