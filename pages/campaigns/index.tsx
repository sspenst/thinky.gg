import { GetServerSidePropsContext } from 'next';
import Image from 'next/image';
import React, { useCallback } from 'react';
import Page from '../../components/page';
import SelectCard from '../../components/selectCard';
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
  const reqUser = token ? await getUserFromToken(token) : null;
  const campaigns = await CampaignModel.find<Campaign>()
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
        description: 'The original block push game.',
        id: '6323f3d2d37c950d4fea1d4a',
        image: '/psychopath.ico',
        year: 2005,
      },
      {
        alt: 'Psychopath 2',
        author: 'k2xl',
        description: 'The sequel to Psychopath.',
        id: '6323f5d7d37c950d4fea1d53',
        image: '/psychopath2.ico',
        year: 2006,
      },
      {
        alt: 'Mental Block',
        author: 'ybbun',
        description: 'Android app inspired by the original Psychopath.',
        id: '6323f4a9d37c950d4fea1d4e',
        image: '/mentalBlock.webp',
        year: 2014,
      },
      {
        alt: 'PATHOS',
        author: 'KingOreO',
        description: 'Story mode Steam game with many new block types.',
        id: '6323f549d37c950d4fea1d52',
        image: '/pathos.png',
        year: 2017,
      },
      {
        alt: 'Pathology',
        author: 'sspenst',
        description: 'The latest of the block pushing games.',
        id: '632ba307e3fc0f5669f7effa',
        image: '/logo.svg',
        year: 2022,
      },
    ];

    return campaignInfos.map(campaignInfo => {
      const enrichedCampaign = enrichedCampaigns.find(campaign => campaign._id.toString() === campaignInfo.id);

      if (!enrichedCampaign) {
        return null;
      }

      return (
        <div className='flex flex-col' key={`campaign-info-${campaignInfo.id}`}>
          <div className='pt-4'
            style={{
              borderBottom: '1px solid',
              borderColor: 'var(--bg-color-3)',
              margin: '0 auto',
              width: '90%',
            }}
          />
          <div className='flex items-center justify-center'>
            <Image src={campaignInfo.image} alt={campaignInfo.alt} width={32} height={32} />
            <SelectCard
              option={new SelectOption(
                enrichedCampaign._id.toString(),
                enrichedCampaign.name,
                enrichedCampaign.collections.length === 1 ?
                  `/collection/${enrichedCampaign.collections[0].slug}` :
                  `/campaign/${enrichedCampaign.slug}`,
                new SelectOptionStats(enrichedCampaign.levelCount, enrichedCampaign.userCompletedCount)
              )}
            />
          </div>
          <div>
            {campaignInfo.description}
          </div>
          <div className='italic'>
            {campaignInfo.author} - {campaignInfo.year}
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
          Campaigns that have been ported to Pathology.
          {getCampaigns()}
        </div>
      </>
    </Page>
  );
}
