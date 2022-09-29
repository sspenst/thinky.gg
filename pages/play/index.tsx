import { GetServerSidePropsContext } from 'next';
import React, { useCallback } from 'react';
import Page from '../../components/page';
import Select from '../../components/select';
import { enrichCollection } from '../../helpers/enrich';
import { logger } from '../../helpers/logger';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import Campaign from '../../models/db/campaign';
import { EnrichedCollection } from '../../models/db/collection';
import { CampaignModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token) : null;
  const campaign = await CampaignModel.findOne<Campaign>({ slug: 'pathology' })
    .populate({
      path: 'collections',
      populate: {
        match: { isDraft: false },
        path: 'levels',
        select: '_id leastMoves',
      },
      select: '_id levels name slug',
    }).sort({ name: 1 });

  if (!campaign) {
    logger.error('CampaignModel.find returned null in pages/play');

    return {
      notFound: true,
    };
  }

  const enrichedCollections = await Promise.all(campaign.collections.map(collection => enrichCollection(collection, reqUser)));

  return {
    props: {
      enrichedCollections: JSON.parse(JSON.stringify(enrichedCollections)),
    } as CampaignProps
  };
}

interface CampaignProps {
  enrichedCollections: EnrichedCollection[];
}

/* istanbul ignore next */
export default function CollectionPage({ enrichedCollections }: CampaignProps) {
  const getOptions = useCallback(() => {
    return enrichedCollections.map(enrichedCollections => new SelectOption(
      enrichedCollections._id.toString(),
      enrichedCollections.name,
      `/collection/${enrichedCollections.slug}`,
      new SelectOptionStats(enrichedCollections.levelCount, enrichedCollections.userCompletedCount),
    ));
  }, [enrichedCollections]);

  return (
    <Page title={'Play'}>
      <>
        <Select options={getOptions()} prefetch={false} />
      </>
    </Page>
  );
}
