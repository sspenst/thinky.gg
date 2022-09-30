import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useState } from 'react';
import LinkInfo from '../../components/linkInfo';
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
        populate: { path: 'userId', model: 'User', select: 'name' },
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
  const router = useRouter();
  const [selectedCollection, setSelectedCollection] = useState<EnrichedCollection>();
  const { cid } = router.query;

  useEffect(() => {
    setSelectedCollection(enrichedCollections.find(c => c._id.toString() === cid));
  }, [cid, enrichedCollections]);

  const getOptions = useCallback(() => {
    return enrichedCollections.map(enrichedCollection => {
      return {
        id: enrichedCollection._id.toString(),
        onClick: () => router.push(`/play?cid=${enrichedCollection._id}`, undefined, { shallow: true }),
        stats: new SelectOptionStats(enrichedCollection.levelCount, enrichedCollection.userCompletedCount),
        text: enrichedCollection.name,
      } as SelectOption;
    });
  }, [enrichedCollections, router]);

  const getLevelOptions = useCallback(() => {
    if (!selectedCollection) {
      return [];
    }

    return selectedCollection.levels.map((level: EnrichedLevel) => {
      return {
        author: level.userId.name,
        height: Dimensions.OptionHeightLarge,
        href: `/level/${level.slug}?cid=${selectedCollection._id}&play=true`,
        id: level._id.toString(),
        level: level,
        stats: new SelectOptionStats(level.leastMoves, level.userMoves),
        text: level.name,
      } as SelectOption;
    });
  }, [selectedCollection]);

  return (
    <Page
      folders={selectedCollection ? [new LinkInfo('Play', undefined, () => router.push('/play', undefined, { shallow: true }))] : undefined}
      title={selectedCollection?.name ?? 'Play'}
    >
      <>
        <h1 className='text-2xl text-center pb-1 pt-3'>
          {selectedCollection?.name ?? 'Pathology'}
        </h1>
        {selectedCollection ?
          <>
            <div className='flex justify-center'>
              <button className='underline pt-2' onClick={() => router.push('/play', undefined, { shallow: true })}>
                Back
              </button>
            </div>
            <Select options={getLevelOptions()} prefetch={false} />
          </>
          :
          <Select options={getOptions()} prefetch={false} />
        }
      </>
    </Page>
  );
}
