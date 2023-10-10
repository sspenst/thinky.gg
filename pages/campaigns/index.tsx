import TestId from '@root/constants/testId';
import { PipelineStage, Types } from 'mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Image from 'next/image';
import React, { useCallback } from 'react';
import SelectCard from '../../components/cards/selectCard';
import Page from '../../components/page/page';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import { EnrichedCampaign } from '../../models/db/campaign';
import { CampaignModel, CollectionModel, LevelModel, StatModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';

const campaignInfos: CampaignInfo[] = process.env.NODE_ENV !== 'test' ? [
  {
    alt: 'Psychopath',
    author: 'k2xl',
    description: 'The original block pushing game.',
    id: '6323f3d2d37c950d4fea1d4a',
    image: '/psychopath.ico',
    year: 2005,
  },
  {
    alt: 'Psychopath 2',
    author: 'k2xl',
    description: 'The sequel to Psychopath with new block types.',
    id: '6323f5d7d37c950d4fea1d53',
    image: '/psychopath2.ico',
    year: 2006,
  },
  {
    alt: 'Mental Block',
    author: 'ybbun',
    // description: 'Android app inspired by the original Psychopath.',
    description: 'Released on Android - inspired by the original Psychopath.',
    id: '6323f4a9d37c950d4fea1d4e',
    image: '/mentalBlock.webp',
    year: 2014,
  },
  {
    alt: 'PATHOS',
    author: 'KingOreO',
    description: 'A subset of levels from the PATHOS Steam game.',
    id: '6323f549d37c950d4fea1d52',
    image: '/pathos.png',
    year: 2017,
  },
] : [{ id: TestId.CAMPAIGN_OFFICIAL } as CampaignInfo];

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  const campaignsAgg = await CampaignModel.aggregate([
    {
      $match: {
        _id: {
          $in: campaignInfos.map(campaignInfo => new Types.ObjectId(campaignInfo.id))
        }
      }
    },
    {
      $project: {
        _id: 1,
        levels: 1,
        name: 1,
        slug: 1,
        collections: 1
      }
    },
    {
      $lookup: {
        from: CollectionModel.collection.name,
        localField: 'collections',
        foreignField: '_id',
        as: 'collections',
        pipeline: [
          {
            $project: {
              _id: 1,
              levels: 1,
              slug: 1,
            }
          },
          {
            $lookup: {
              from: LevelModel.collection.name,
              localField: 'levels',
              foreignField: '_id',
              as: 'levels',
              pipeline: [
                {
                  $match: {
                    isDraft: false
                  }
                },
                {
                  $project: {
                    _id: 1,
                    leastMoves: 1
                  }
                },
                {
                  $lookup: {
                    from: StatModel.collection.name,
                    localField: '_id',
                    foreignField: 'levelId',
                    as: 'stats',
                    pipeline: [
                      {
                        $match: {
                          userId: reqUser?._id,
                          complete: true
                        },
                      },
                      {
                        $project: {
                          _id: 0,
                          // project complete to 1 if it exists, otherwise 0
                          complete: {
                            $cond: {
                              if: { $eq: ['$complete', true] },
                              then: 1,
                              else: 0
                            }
                          }
                        }
                      }
                    ]
                  },
                },
                {
                  $unwind: {
                    path: '$stats',
                    preserveNullAndEmptyArrays: true
                  }
                }
              ]
            }
          },
          // add up all of the stats.complete from the levels.stats
          {
            $addFields: {
              levelCount: {
                $size: '$levels'
              },
              userSolvedCount: {
                $sum: '$levels.stats.complete'
              }
            }
          }
        ],
      }
    },
    // add up all of the stats.complete from the collections.levels.stats
    {
      $addFields: {
        levelCount: {
          $sum: '$collections.levelCount'
        },
        userSolvedCount: {
          $sum: '$collections.userSolvedCount'
        }
      }
    },
    {
      $sort: {
        name: 1
      }
    },
    {
      $unset: 'collections.levels'
    },
    {
      $project: {
        collections: 1,
        _id: 1,
        name: 1,
        slug: 1,
        levelCount: 1,
        userSolvedCount: 1
      }
    },
  ] as PipelineStage[]);

  return {
    props: {
      enrichedCampaigns: JSON.parse(JSON.stringify(campaignsAgg)),
    } as CampaignsProps
  };
}

interface CampaignInfo {
  alt: string;
  author: string;
  description: string;
  id: string;
  image: string;
  year: number;
}

interface CampaignsProps {
  enrichedCampaigns: EnrichedCampaign[];
}

/* istanbul ignore next */
export default function Campaigns({ enrichedCampaigns }: CampaignsProps) {
  const getCampaigns = useCallback(() => {
    return campaignInfos.map(campaignInfo => {
      const enrichedCampaign = enrichedCampaigns.find(campaign => campaign._id.toString() === campaignInfo.id);

      if (!enrichedCampaign) {
        return null;
      }

      return (
        <div className='flex flex-col w-80' key={`campaign-info-${campaignInfo.id}`}>
          <div className='flex items-center justify-center'>
            <Image src={campaignInfo.image} alt={campaignInfo.alt} width={32} height={32} />
            <SelectCard
              option={{
                href: enrichedCampaign.collections.length === 1 ?
                  `/collection/${enrichedCampaign.collections[0].slug}` :
                  `/campaign/${enrichedCampaign.slug}`,
                id: enrichedCampaign._id.toString(),
                stats: new SelectOptionStats(enrichedCampaign.levelCount, enrichedCampaign.userSolvedCount),
                text: enrichedCampaign.name,
              } as SelectOption}
            />
          </div>
          <div className='px-4'>
            <div>
              {campaignInfo.description}
            </div>
            <div className='italic'>
              {campaignInfo.author} - {campaignInfo.year}
            </div>
          </div>
        </div>
      );
    });
  }, [enrichedCampaigns]);

  return (
    <Page title={'Campaigns'}>
      <div className='text-center p-4'>
        <h1 className='text-2xl pb-2'>
          Campaigns
        </h1>
        <div className='italic'>
          Created by the Pathology community.
        </div>
        <div className='flex flex-wrap justify-center pt-4'>
          {getCampaigns()}
        </div>
      </div>
    </Page>
  );
}
