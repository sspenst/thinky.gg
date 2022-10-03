import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useState } from 'react';
import LinkInfo from '../../components/linkInfo';
import UnlockModal from '../../components/modal/unlockModal';
import Page from '../../components/page';
import SelectCard from '../../components/selectCard';
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

interface UnlockRequirement {
  disabled: (collections: EnrichedCollection[]) => boolean;
  text: string;
}

/* istanbul ignore next */
export default function PlayPage({ enrichedCollections }: CampaignProps) {
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const router = useRouter();
  const [selectedCollection, setSelectedCollection] = useState<EnrichedCollection>();
  const [unlocked, setUnlocked] = useState(false);
  const { cid } = router.query;

  const mustCompletePrevLevel = useCallback((collectionSlug: string, prevLevelSlug: string) => {
    return {
      disabled: (collections: EnrichedCollection[]) => {
        const c = collections.find(c => c.slug === collectionSlug);

        if (!c) {
          return false;
        }

        const l = (c.levels as EnrichedLevel[]).find(l => l.slug === prevLevelSlug);

        return l && l.userMoves !== l.leastMoves;
      },
      text: 'Must complete the previous level',
    } as UnlockRequirement;
  }, []);

  const unlockRequirements = useCallback(() => {
    return {
      'sspenst/03-holes-intro': {
        disabled: (collections: EnrichedCollection[]) => {
          const c2 = collections.find(c => c.slug === 'sspenst/02-essence');

          return c2 && c2.userCompletedCount < 4;
        },
        text: 'Must complete 4 levels from 02 - Essence',
      },
      'sspenst/09-exam': {
        disabled: (collections: EnrichedCollection[]) => {
          const c6 = collections.find(c => c.slug === 'sspenst/06-tricks');
          const c7 = collections.find(c => c.slug === 'sspenst/07-out-of-reach');
          const c8 = collections.find(c => c.slug === 'sspenst/08-pipelining');

          return c6 && c7 && c8 && (c6.userCompletedCount + c7.userCompletedCount + c8.userCompletedCount) < 20;
        },
        text: 'Must complete 20 levels from Tricks, Out of Reach, and Pipelining',
      },
      'cosmovibe/2-tuna-eye': mustCompletePrevLevel('cosmovibe/a1-fish-eye', 'cosmovibe/1-salmon-eye'),
      'cosmovibe/3-mackerel-eye': mustCompletePrevLevel('cosmovibe/a1-fish-eye', 'cosmovibe/2-tuna-eye'),
      'cosmovibe/4-yellowtail-eye': mustCompletePrevLevel('cosmovibe/a1-fish-eye', 'cosmovibe/3-mackerel-eye'),
      'cosmovibe/5-squid-eye': mustCompletePrevLevel('cosmovibe/a1-fish-eye', 'cosmovibe/4-yellowtail-eye'),
      'cosmovibe/6-flounder-eye': mustCompletePrevLevel('cosmovibe/a1-fish-eye', 'cosmovibe/5-squid-eye'),
      'cosmovibe/7-herring-eye': mustCompletePrevLevel('cosmovibe/a1-fish-eye', 'cosmovibe/6-flounder-eye'),
      'cosmovibe/8-shark-eye': mustCompletePrevLevel('cosmovibe/a1-fish-eye', 'cosmovibe/7-herring-eye'),
      'hi19hi19/precipice-blade-2': mustCompletePrevLevel('hi19hi19/level-set-precipice-blades', 'hi19hi19/precipice-blade'),
      'hi19hi19/precipice-blade-3': mustCompletePrevLevel('hi19hi19/level-set-precipice-blades', 'hi19hi19/precipice-blade-2'),
      'hi19hi19/clearing-out-2': mustCompletePrevLevel('hi19hi19/level-set-clearing-out', 'hi19hi19/clearing-out'),
      'hi19hi19/clearing-out-3': mustCompletePrevLevel('hi19hi19/level-set-clearing-out', 'hi19hi19/clearing-out-2'),
      'hi19hi19/clearing-out-4': mustCompletePrevLevel('hi19hi19/level-set-clearing-out', 'hi19hi19/clearing-out-3'),
      'hi19hi19/clearing-out-5': mustCompletePrevLevel('hi19hi19/level-set-clearing-out', 'hi19hi19/clearing-out-4'),
    } as { [slug: string]: UnlockRequirement };
  }, [mustCompletePrevLevel]);

  useEffect(() => {
    setSelectedCollection(enrichedCollections.find(c => c._id.toString() === cid));
  }, [cid, enrichedCollections]);

  const getOptions = useCallback(() => {
    return enrichedCollections.map(enrichedCollection => {
      const unlockRequirement = unlockRequirements()[enrichedCollection.slug];
      const disabled = !unlocked && unlockRequirement?.disabled(enrichedCollections);

      return (
        <div className='flex flex-col w-60' key={`collection-${enrichedCollection._id.toString()}`}>
          <div className='flex items-center justify-center'>
            <SelectCard
              option={{
                disabled: disabled,
                id: enrichedCollection._id.toString(),
                onClick: () => router.push(`/play?cid=${enrichedCollection._id}`, undefined, { shallow: true }),
                stats: new SelectOptionStats(enrichedCollection.levelCount, enrichedCollection.userCompletedCount),
                text: enrichedCollection.name,
              } as SelectOption}
            />
          </div>
          {unlockRequirement && disabled &&
            <div className='px-4 italic text-center'>
              {unlockRequirement.text}
            </div>
          }
        </div>
      );
    });
  }, [enrichedCollections, router, unlocked, unlockRequirements]);

  const getLevelOptions = useCallback(() => {
    if (!selectedCollection) {
      return [];
    }

    return selectedCollection.levels.map((level: EnrichedLevel) => {
      const unlockRequirement = unlockRequirements()[level.slug];
      const disabled = !unlocked && unlockRequirement?.disabled(enrichedCollections);

      return (
        <div className='flex flex-col w-60' key={`collection-${level._id.toString()}`}>
          <div className='flex items-center justify-center'>
            <SelectCard
              option={{
                author: level.userId.name,
                disabled: disabled,
                height: Dimensions.OptionHeightLarge,
                href: `/level/${level.slug}?cid=${selectedCollection._id}&play=true`,
                id: level._id.toString(),
                level: level,
                stats: new SelectOptionStats(level.leastMoves, level.userMoves),
                text: level.name,
              } as SelectOption}
            />
          </div>
          {unlockRequirement && disabled &&
            <div className='px-4 italic text-center'>
              {unlockRequirement.text}
            </div>
          }
        </div>
      );
    });
  }, [enrichedCollections, selectedCollection, unlocked, unlockRequirements]);

  return (
    <Page
      folders={selectedCollection ? [new LinkInfo('Play', undefined, () => router.push('/play', undefined, { shallow: true }))] : undefined}
      title={selectedCollection?.name ?? 'Play'}
    >
      <>
        <h1 className='text-2xl text-center pb-1 pt-3'>
          {selectedCollection?.name ?? 'Pathology'}
        </h1>
        <div className='flex justify-center'>
          {selectedCollection &&
            <button className='underline pt-2 pr-4' onClick={() => router.push('/play', undefined, { shallow: true })}>
              Back
            </button>
          }
          <button className='underline pt-2' onClick={() => setIsUnlockModalOpen(true)}>
            Unlock
          </button>
        </div>
        <div className='flex flex-wrap justify-center pt-4'>
          {selectedCollection ? getLevelOptions() : getOptions()}
        </div>
        <UnlockModal
          closeModal={() => setIsUnlockModalOpen(false)}
          isOpen={isUnlockModalOpen}
          onConfirm={() => {
            setIsUnlockModalOpen(false);
            setUnlocked(true);
          }}
        />
      </>
    </Page>
  );
}
