import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Image from 'next/image';
import React, { useCallback } from 'react';
import SelectCard from '../../components/cards/selectCard';
import Page from '../../components/page/page';
import { enrichCampaign } from '../../helpers/enrich';
import { logger } from '../../helpers/logger';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import Campaign, { EnrichedCampaign } from '../../models/db/campaign';
import { CampaignModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  // all campaigns except the pathology campaign
  const campaigns = await CampaignModel.find<Campaign>({ slug: { $ne: 'pathology' } })
    .populate({
      path: 'collections',
      populate: {
        match: { isDraft: false },
        path: 'levels',
        select: '_id leastMoves',
      },
      select: '_id levels name slug',
    }).sort({ name: 1 });

  if (!campaigns) {
    logger.error('CampaignModel.find returned null in pages/campaigns');

    return {
      notFound: true,
    };
  }

  const enrichedCampaigns = await Promise.all(campaigns.map(campaign => enrichCampaign(campaign, reqUser)));

  return {
    props: {
      enrichedCampaigns: JSON.parse(JSON.stringify(enrichedCampaigns)),
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
    const campaignInfos: CampaignInfo[] = [
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
    ];

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
                stats: new SelectOptionStats(enrichedCampaign.levelCount, enrichedCampaign.userCompletedCount),
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
      <>
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
      </>
    </Page>
  );
}
