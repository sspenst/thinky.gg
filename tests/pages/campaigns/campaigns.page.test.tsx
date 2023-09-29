import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import TestId from '../../../constants/testId';
import { logger } from '../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../lib/getTokenCookie';
import { CampaignModel } from '../../../models/mongoose';
import { getServerSideProps } from '../../../pages/campaigns';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});

describe('pages/campaigns page', () => {
  test('getServerSideProps not logged in and with valid params', async () => {
    const ret = await getServerSideProps({} as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props?.enrichedCampaigns).toBeDefined();

    expect(ret.props?.enrichedCampaigns).toHaveLength(1);
    expect(ret.props?.enrichedCampaigns[0]._id).toBe(TestId.CAMPAIGN_OFFICIAL);
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
    expect(ret.props?.enrichedCampaigns).toBeDefined();
    expect(ret.props?.enrichedCampaigns).toHaveLength(1);
    expect(ret.props?.enrichedCampaigns[0]._id).toBe(TestId.CAMPAIGN_OFFICIAL);
  }
  );
});
