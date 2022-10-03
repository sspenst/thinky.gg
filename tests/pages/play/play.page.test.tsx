import { ObjectId } from 'bson';
import { GetServerSidePropsContext } from 'next';
import TestId from '../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../lib/getTokenCookie';
import { CampaignModel } from '../../../models/mongoose';
import { getServerSideProps } from '../../../pages/play';

beforeAll(async () => {
  await dbConnect();
  await CampaignModel.create({
    _id: new ObjectId(),
    collections: [new ObjectId(TestId.COLLECTION_OFFICIAL)],
    name: 'Pathology',
    slug: 'pathology',
  });
});
afterAll(async () => {
  await dbDisconnect();
});
//enableFetchMocks()

describe('pages/play page', () => {
  test('getServerSideProps not logged in', async () => {
    // Created from initialize db file
    const context = {

    };
    const ret = await getServerSideProps(context as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeUndefined();
  });
  test('getServerSideProps logged in', async () => {
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
    expect(ret.props?.enrichedCollections[0]._id).toBe(TestId.COLLECTION_OFFICIAL);
  });
  test('getServerSideProps logged in no collection exists', async () => {
    await CampaignModel.deleteOne({ 'slug': 'pathology' });
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
