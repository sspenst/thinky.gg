import { GameId } from '@root/constants/GameId';
import MockDate from 'mockdate';
import { Types } from 'mongoose';
import { GetServerSidePropsContext } from 'next';
import TestId from '../../../constants/testId';
import { createNewReviewOnYourLevelNotification } from '../../../helpers/notificationHelper';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../lib/getTokenCookie';
import { getServerSideProps } from '../../../pages/notifications/index';

beforeAll(async () => {
  await dbConnect();

  for (let i = 0; i < 30; i++) {
    MockDate.set(Date.now() + 1);
    await createNewReviewOnYourLevelNotification(GameId.PATHOLOGY, new Types.ObjectId(TestId.USER), new Types.ObjectId(TestId.USER_B), new Types.ObjectId(), 'id ' + i, true);
  }

  MockDate.set(Date.now() + 1);
  await createNewReviewOnYourLevelNotification(GameId.PATHOLOGY, new Types.ObjectId(TestId.USER), new Types.ObjectId(TestId.USER_B), TestId.LEVEL, 'test level id');
});
afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
//enableFetchMocks()

describe('pages/notifications page', () => {
  it('getServerSideProps should rediect without auth', async () => {
    // Created from initialize db file
    const context = {
      query: {

      }
    };
    const ret = await getServerSideProps(context as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.redirect).toBeDefined();
    expect(ret.redirect?.destination).toBe('/login');
    expect(ret.redirect?.permanent).toBe(false);
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
    expect(ret.props?.notifications).toBeDefined();
    expect(ret.props?.notifications).toHaveLength(20);
  });
  it('getServerSideProps with logged in and differents parameters should function', async () => {
    // Created from initialize db file
    const context = {
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER)
        }

      },
      query: {
        page: 'ekiwm', // should fallback to '1'
        filter: 'unread'
      }
    };
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props?.notifications).toBeDefined();
    expect(ret.props?.notifications).toHaveLength(20);
    expect(ret.props?.notifications[0].message).toBe('test level id,false');
    expect(ret.props?.notifications[1].message).toBe('id 29,true');
  });
  it('getServerSideProps with logged in and page 2 parameters should function', async () => {
    // Created from initialize db file
    const context = {
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER)
        }

      },
      query: {
        page: '2',
        filter: 'unread'
      }
    };
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props?.notifications).toBeDefined();
    expect(ret.props?.notifications).toHaveLength(11);
    expect(ret.props?.notifications[0].message).toBe('id 10,true');
    expect(ret.props?.notifications[1].message).toBe('id 9,true');
  });
});
