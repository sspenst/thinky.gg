import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React, { useCallback, useState } from 'react';
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
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

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
  const [unlocked, setUnlocked] = useState(false);

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
      text: 'Requires completing the previous level',
    } as UnlockRequirement;
  }, []);

  const unlockRequirements = useCallback(() => {
    return {
      'sspenst/02-essence': {
        disabled: (collections: EnrichedCollection[]) => {
          const c1 = collections.find(c => c.slug === 'sspenst/01-learning');

          return c1 && c1.userCompletedCount < 5;
        },
        text: 'Requires completing 5 levels from Learning',
      },
      'sspenst/03-fish-eye': {
        disabled: (collections: EnrichedCollection[]) => {
          const c2 = collections.find(c => c.slug === 'sspenst/02-essence');

          return c2 && c2.userCompletedCount < 5;
        },
        text: 'Requires completing 5 levels from Essence',
      },
      'sspenst/04-holes-intro': {
        disabled: (collections: EnrichedCollection[]) => {
          const c2 = collections.find(c => c.slug === 'sspenst/02-essence');

          return c2 && c2.userCompletedCount < 5;
        },
        text: 'Requires completing 5 levels from Essence',
      },
      'sspenst/05-locks': {
        disabled: (collections: EnrichedCollection[]) => {
          const c2 = collections.find(c => c.slug === 'sspenst/02-essence');

          return c2 && c2.userCompletedCount < 5;
        },
        text: 'Requires completing 5 levels from Essence',
      },
      'sspenst/06-restricted': {
        disabled: (collections: EnrichedCollection[]) => {
          const c4 = collections.find(c => c.slug === 'sspenst/04-holes-intro');
          const c5 = collections.find(c => c.slug === 'sspenst/05-locks');

          return (c4 && c4.userCompletedCount < 3) && (c5 && c5.userCompletedCount < 3);
        },
        text: 'Requires completing 3 levels from Holes Intro and 3 levels from Locks',
      },
      'sspenst/07-precipice-blades': {
        disabled: (collections: EnrichedCollection[]) => {
          const c6 = collections.find(c => c.slug === 'sspenst/06-restricted');

          return c6 && c6.userCompletedCount < 7;
        },
        text: 'Requires completing 7 levels from Restricted',
      },
      'sspenst/08-clearing-out': {
        disabled: (collections: EnrichedCollection[]) => {
          const c6 = collections.find(c => c.slug === 'sspenst/06-restricted');

          return c6 && c6.userCompletedCount < 7;
        },
        text: 'Requires completing 7 levels from Restricted',
      },
      'sspenst/09-tricks': {
        disabled: (collections: EnrichedCollection[]) => {
          const c4 = collections.find(c => c.slug === 'sspenst/04-holes-intro');
          const c5 = collections.find(c => c.slug === 'sspenst/05-locks');
          const c6 = collections.find(c => c.slug === 'sspenst/06-restricted');

          return c4 && c5 && c6 && (c4.userCompletedCount + c5.userCompletedCount + c6.userCompletedCount) < 20;
        },
        text: 'Requires completing 20 levels from Holes Intro, Locks, and Restricted',
      },
      'sspenst/10-out-of-reach': {
        disabled: (collections: EnrichedCollection[]) => {
          const c4 = collections.find(c => c.slug === 'sspenst/04-holes-intro');
          const c5 = collections.find(c => c.slug === 'sspenst/05-locks');
          const c6 = collections.find(c => c.slug === 'sspenst/06-restricted');

          return c4 && c5 && c6 && (c4.userCompletedCount + c5.userCompletedCount + c6.userCompletedCount) < 20;
        },
        text: 'Requires completing 20 levels from Holes Intro, Locks, and Restricted',
      },
      'sspenst/11-pipelining': {
        disabled: (collections: EnrichedCollection[]) => {
          const c4 = collections.find(c => c.slug === 'sspenst/04-holes-intro');
          const c5 = collections.find(c => c.slug === 'sspenst/05-locks');
          const c6 = collections.find(c => c.slug === 'sspenst/06-restricted');

          return c4 && c5 && c6 && (c4.userCompletedCount + c5.userCompletedCount + c6.userCompletedCount) < 20;
        },
        text: 'Requires completing 20 levels from Holes Intro, Locks, and Restricted',
      },
      'sspenst/12-exam': {
        disabled: (collections: EnrichedCollection[]) => {
          const c6 = collections.find(c => c.slug === 'sspenst/09-tricks');
          const c7 = collections.find(c => c.slug === 'sspenst/10-out-of-reach');
          const c8 = collections.find(c => c.slug === 'sspenst/11-pipelining');

          return c6 && c7 && c8 && (c6.userCompletedCount + c7.userCompletedCount + c8.userCompletedCount) < 25;
        },
        text: 'Requires completing 25 levels from Tricks, Out of Reach, and Pipelining',
      },
      'cosmovibe/2-tuna-eye': mustCompletePrevLevel('sspenst/03-fish-eye', 'cosmovibe/1-salmon-eye'),
      'cosmovibe/3-mackerel-eye': mustCompletePrevLevel('sspenst/03-fish-eye', 'cosmovibe/2-tuna-eye'),
      'cosmovibe/4-yellowtail-eye': mustCompletePrevLevel('sspenst/03-fish-eye', 'cosmovibe/3-mackerel-eye'),
      'cosmovibe/5-squid-eye': mustCompletePrevLevel('sspenst/03-fish-eye', 'cosmovibe/4-yellowtail-eye'),
      'cosmovibe/6-flounder-eye': mustCompletePrevLevel('sspenst/03-fish-eye', 'cosmovibe/5-squid-eye'),
      'cosmovibe/7-herring-eye': mustCompletePrevLevel('sspenst/03-fish-eye', 'cosmovibe/6-flounder-eye'),
      'cosmovibe/8-shark-eye': mustCompletePrevLevel('sspenst/03-fish-eye', 'cosmovibe/7-herring-eye'),
      'hi19hi19/precipice-blade-2': mustCompletePrevLevel('sspenst/07-precipice-blades', 'hi19hi19/precipice-blade'),
      'hi19hi19/precipice-blade-3': mustCompletePrevLevel('sspenst/07-precipice-blades', 'hi19hi19/precipice-blade-2'),
      'hi19hi19/clearing-out-2': mustCompletePrevLevel('sspenst/08-clearing-out', 'hi19hi19/clearing-out'),
      'hi19hi19/clearing-out-3': mustCompletePrevLevel('sspenst/08-clearing-out', 'hi19hi19/clearing-out-2'),
      'hi19hi19/clearing-out-4': mustCompletePrevLevel('sspenst/08-clearing-out', 'hi19hi19/clearing-out-3'),
      'hi19hi19/clearing-out-5': mustCompletePrevLevel('sspenst/08-clearing-out', 'hi19hi19/clearing-out-4'),
    } as { [slug: string]: UnlockRequirement };
  }, [mustCompletePrevLevel]);

  const getLevelOptions = useCallback((enrichedCollection: EnrichedCollection) => {
    return enrichedCollection.levels.map((level: EnrichedLevel) => {
      const unlockRequirement = unlockRequirements()[level.slug];
      const disabled = !unlocked && unlockRequirement?.disabled(enrichedCollections);

      return (
        <div className='flex flex-col w-60' key={`collection-${level._id.toString()}`}>
          <div className='flex items-center justify-center'>
            <SelectCard
              option={{
                author: level.userId.name,
                disabled: disabled,
                height: Dimensions.OptionHeightMedium,
                hideDifficulty: true,
                href: `/level/${level.slug}?cid=${enrichedCollection._id}&play=true`,
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
  }, [enrichedCollections, unlocked, unlockRequirements]);

  const getOptions = useCallback(() => {
    return enrichedCollections.map(enrichedCollection => {
      const unlockRequirement = unlockRequirements()[enrichedCollection.slug];
      const disabled = !unlocked && unlockRequirement?.disabled(enrichedCollections);
      const stats = new SelectOptionStats(enrichedCollection.levelCount, enrichedCollection.userCompletedCount);

      return (
        <div
          className='text-center mt-2 mb-4'
          key={`collection-${enrichedCollection._id.toString()}`}
        >
          <div className='text-2xl font-bold mb-1'>
            {enrichedCollection.name}
          </div>
          {unlockRequirement && disabled ?
            <div className='italic text-center'>
              {unlockRequirement.text}
            </div>
            :
            <>
              <div className='text-lg font-bold' style={{
                color: stats.getColor(),
                textShadow: '1px 1px black',
              }}>
                {stats.getText()}
              </div>
              <div className='flex flex-wrap justify-center'>
                {getLevelOptions(enrichedCollection)}
              </div>
            </>
          }
        </div>
      );
    });
  }, [enrichedCollections, getLevelOptions, unlocked, unlockRequirements]);

  return (
    <Page title={'Play'}>
      <>
        <div className='pt-4'>
          {getOptions()}
        </div>
        <div className='flex justify-center pb-4'>
          {unlocked ? '🔓' :
            <button onClick={() => setIsUnlockModalOpen(true)}>
              {unlocked ? '🔓' : '🔒'}
            </button>
          }
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
