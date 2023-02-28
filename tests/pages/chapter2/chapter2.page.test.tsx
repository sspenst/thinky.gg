import { Types } from 'mongoose';
import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import TestId from '../../../constants/testId';
import { logger } from '../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../lib/getTokenCookie';
import { CampaignModel, UserModel } from '../../../models/mongoose';
import { getServerSideProps } from '../../../pages/chapter2';

beforeAll(async () => {
  await dbConnect();
  await CampaignModel.create({
    _id: new Types.ObjectId(),
    collections: [new Types.ObjectId(TestId.COLLECTION)],
    name: 'Chapter 1',
    slug: 'chapter2',
  });
});
afterAll(async () => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('pages/chapter2 page', () => {
  test('getServerSideProps not logged in', async () => {
    // Created from initialize db file
    const context = {

    };
    const ret = await getServerSideProps(context as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeUndefined();
  });
  test('getServerSideProps logged in', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    // Created from initialize db file
    const context = {
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER)
        }
      },
    };
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.redirect).toBeDefined();
    expect(ret.redirect?.destination).toBe('/play');
  });
  test('getServerSideProps logged in chapterUnlocked 2', async () => {
    await UserModel.updateOne({ _id: new Types.ObjectId(TestId.USER) }, { $set: { chapterUnlocked: 2 } });

    // Created from initialize db file
    const context = {
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER)
        }
      },
    };
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props?.enrichedCollections).toBeDefined();
    expect(ret.props?.enrichedCollections[0]._id).toBe(TestId.COLLECTION);
  });
  test('getServerSideProps logged in no collection exists', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await CampaignModel.deleteOne({ 'slug': 'chapter2' });
    // Created from initialize db file
    const context = {
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER)
        }
      },
    };
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeUndefined();
  });
});
