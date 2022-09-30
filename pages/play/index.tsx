import { GetServerSidePropsContext } from 'next';
import React, { useCallback, useState } from 'react';
import Page from '../../components/page';
import Select from '../../components/select';
import Dimensions from '../../constants/dimensions';
import { enrichCollection, enrichLevels } from '../../helpers/enrich';
import { logger } from '../../helpers/logger';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import Campaign from '../../models/db/campaign';
import { EnrichedCollection } from '../../models/db/collection';
import { EnrichedLevel } from '../../models/db/level';
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
  const enrichedLevels = await Promise.all(enrichedCollections.map(collection => enrichLevels(collection.levels, reqUser)));

  for (let i = 0; i < enrichedCollections.length; i++) {
    enrichedCollections[i].levels = enrichedLevels[i];
  }

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
export default function PlayPage({ enrichedCollections }: CampaignProps) {
  const [collectionId, setCollectionId] = useState<string>();

  const getOptions = useCallback(() => {
    return enrichedCollections.map(enrichedCollections => {
      return {
        id: enrichedCollections._id.toString(),
        onClick: () => setCollectionId(enrichedCollections._id.toString()),
        stats: new SelectOptionStats(enrichedCollections.levelCount, enrichedCollections.userCompletedCount),
        text: enrichedCollections.name,
      } as SelectOption;
    });
  }, [enrichedCollections]);

  const getLevelOptions = useCallback(() => {
    if (!collectionId) {
      return [];
    }

    const collection = enrichedCollections.find(enrichedCollection => enrichedCollection._id.toString() === collectionId);

    if (!collection) {
      return [];
    }

    return collection.levels.map((level: EnrichedLevel) => {
      return {
        height: Dimensions.OptionHeightMedium,
        href: `/level/${level.slug}`,
        id: level._id.toString(),
        level: level,
        stats: new SelectOptionStats(level.leastMoves, level.userMoves),
        text: level.name,
      } as SelectOption;
    });
  }, [collectionId, enrichedCollections]);

  return (
    <Page title={'Play'}>
      <>
        {collectionId ?
          <>
            <button onClick={() => setCollectionId(undefined)}>
              Back
            </button>
            <Select options={getLevelOptions()} prefetch={false} />
          </>
          :
          <Select options={getOptions()} prefetch={false} />
        }
      </>
    </Page>
  );
}
