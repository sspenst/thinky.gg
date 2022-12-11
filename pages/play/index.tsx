import { ObjectId } from 'bson';
import { PipelineStage } from 'mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import React, { useCallback, useState } from 'react';
import UnlockModal from '../../components/modal/unlockModal';
import Page from '../../components/page';
import SelectCard from '../../components/selectCard';
import Dimensions from '../../constants/dimensions';
import { getEnrichLevelsPipelineSteps } from '../../helpers/enrich';
import { logger } from '../../helpers/logger';
import cleanUser from '../../lib/cleanUser';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import Campaign from '../../models/db/campaign';
import { EnrichedCollection } from '../../models/db/collection';
import Level, { EnrichedLevel } from '../../models/db/level';
import { CampaignModel } from '../../models/mongoose';
import { LEVEL_DEFAULT_PROJECTION } from '../../models/schemas/levelSchema';
import { USER_DEFAULT_PROJECTION } from '../../models/schemas/userSchema';
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

  const campaignAgg = await CampaignModel.aggregate([
    {
      $match: {
        slug: 'pathology'
      }
    },
    {
      $lookup: {
        from: 'collections',
        localField: 'collections',
        foreignField: '_id',
        as: 'collections',
        pipeline: [
          {
            // TODO: order is not preserved with $lookup
            $lookup: {
              from: 'levels',
              localField: 'levels',
              foreignField: '_id',
              as: 'levelsPopulated',
              pipeline: [
                {
                  $match: {
                    isDraft: false
                  },
                },
                {
                  $project: {
                    ...LEVEL_DEFAULT_PROJECTION
                  }
                },
                ...getEnrichLevelsPipelineSteps(reqUser, '_id', '') as PipelineStage.Lookup[],
                {
                  $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userId',
                    pipeline: [
                      {
                        $project: {
                          ...USER_DEFAULT_PROJECTION
                        }
                      },
                    ]
                  },
                },
                {
                  $unwind: {
                    path: '$userId',
                    preserveNullAndEmptyArrays: true
                  }
                }

              ]
            },
          },
          {
            $sort: {
              name: 1,
            }
          }
        ],
      }
    }
  ]);

  if (!campaignAgg || campaignAgg.length === 0) {
    logger.error('CampaignModel.find returned null or empty in pages/play');

    return {
      notFound: true,
    };
  }

  const campaign = campaignAgg[0] as Campaign;

  const enrichedCollections = campaign.collections as EnrichedCollection[];

  let completedLevels = 0;
  let totalLevels = 0;

  for (let i = 0; i < enrichedCollections.length; i++) {
    const enrichedCollection = enrichedCollections[i] as EnrichedCollection & { levelsPopulated?: Level[] };

    // replace each level[] object with levelsPopulated[] object
    // convert this to a map with _id as key
    const levelMap = new Map<string, Level>();

    if (enrichedCollection.levelsPopulated) {
      for (const level of enrichedCollection.levelsPopulated) {
        levelMap.set(level._id.toString(), level);
      }
    }

    delete enrichedCollection.levelsPopulated;

    enrichedCollection.levels.forEach((level: unknown, index: number) => {
      enrichedCollection.levels[index] = levelMap.get((level as ObjectId).toString()) as Level;
      cleanUser((enrichedCollection.levels[index] as Level).userId);
    });

    const userCompletedCount = (enrichedCollection.levels as EnrichedLevel[]).filter((level: EnrichedLevel) => level.userMoves === level.leastMoves).length;

    enrichedCollection.userCompletedCount = userCompletedCount;
    completedLevels += userCompletedCount;
    enrichedCollection.levelCount = enrichedCollection.levels.length;
    totalLevels += enrichedCollection.levels.length;
  }

  return {
    props: {
      completedLevels: completedLevels,
      enrichedCollections: JSON.parse(JSON.stringify(enrichedCollections)),
      totalLevels: totalLevels,
    } as CampaignProps
  };
}

interface CampaignProps {
  completedLevels: number;
  enrichedCollections: EnrichedCollection[];
  totalLevels: number;
}

interface UnlockRequirement {
  disabled: (collections: EnrichedCollection[]) => boolean;
  text: string;
}

/* istanbul ignore next */
export default function PlayPage({ completedLevels, enrichedCollections, totalLevels }: CampaignProps) {
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

  let allUnlocksCompleted = true;

  for (const unlockKey in unlockRequirements()) {
    const unlockRequirement = unlockRequirements()[unlockKey];

    if (unlockRequirement.disabled(enrichedCollections)) {
      allUnlocksCompleted = false;
      break;
    }
  }

  const totalStats = new SelectOptionStats(totalLevels, completedLevels);

  return (
    <Page title={'Play'}>
      <>
        <div className='mt-4 mb-6'>
          <div className='flex justify-center font-bold text-3xl text-center'>
            Pathology Official Campaign
          </div>
          <div className='flex justify-center mt-4'>
            <div className='w-2/3 bg-neutral-600 h-2 mb-2 rounded shadow-sm' style={{
              backgroundColor: 'var(--bg-color-3)',
            }}>
              <div className='h-full rounded' style={{
                backgroundColor: totalStats.getColor(),
                transition: 'width 0.5s ease',
                width: completedLevels / totalLevels * 100 + '%',
              }} />
            </div>
          </div>
          <div className='text-lg font-bold flex justify-center' style={{
            color: totalStats.getColor(),
            textShadow: '1px 1px black',
          }}>
            {totalStats.getText()}
          </div>
          {completedLevels === totalLevels &&
            <div className='flex flex-col items-center justify-center text-center mt-2'>
              <div>Congratulations! You&apos;ve completed the official campaign.</div>
              <div>If you&apos;re looking for more levels, try a campaign from the <Link className='font-bold underline' href='/campaigns' passHref>Campaigns</Link> page, or try browsing the <Link className='font-bold underline' href='/search' passHref>Search</Link> page.</div>
              <div>You could also try creating a level of your own on the <Link className='font-bold underline' href='/create' passHref>Create</Link> page.</div>
              <div>We hope you&apos;re enjoying Pathology!</div>
            </div>
          }
        </div>
        <div>
          {getOptions()}
        </div>
        <div className='flex justify-center pb-4'>
          {!allUnlocksCompleted && !unlocked &&
            <button onClick={() => setIsUnlockModalOpen(true)}>
              🔒
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
