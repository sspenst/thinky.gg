import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { Types } from 'mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback } from 'react';
import Select from '../../components/cards/select';
import FormattedAuthorNote from '../../components/formatted/formattedAuthorNote';
import LinkInfo from '../../components/formatted/linkInfo';
import Page from '../../components/page/page';
import { logger } from '../../helpers/logger';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import Campaign from '../../models/db/campaign';
import { EnrichedCollection } from '../../models/db/collection';
import { CampaignModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';
import { getCollections } from '../api/collection-by-id/[id]';

interface CampaignUrlQueryParams extends ParsedUrlQuery {
  slug: string;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  if (!context.params) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const { slug } = context.params as CampaignUrlQueryParams;

  if (!slug || slug.length === 0) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  } else if (slug === 'pathology') {
    return {
      redirect: {
        destination: '/play',
        permanent: false,
      },
    };
  }

  const token = context.req?.cookies?.token;
  const gameId = getGameIdFromReq(context.req);
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const campaign = await CampaignModel.findOne<Campaign>({ slug: slug, gameId: gameId });

  if (!campaign) {
    logger.error('CampaignModel.find returned null in pages/campaign');

    return {
      notFound: true,
    };
  }

  const enrichedCollections = await getCollections(
    {
      matchQuery: { _id: { $in: campaign.collections.map(collection => new Types.ObjectId(collection._id)) } },
      reqUser: reqUser,
    },
  );

  // ensure that enrichedCollections is sorted in the same order as collections
  enrichedCollections.sort((a, b) => {
    return campaign.collections.findIndex(collection => collection._id.toString() === a._id.toString()) -
      campaign.collections.findIndex(collection => collection._id.toString() === b._id.toString());
  });

  return {
    props: {
      campaign: JSON.parse(JSON.stringify(campaign)),
      enrichedCollections: JSON.parse(JSON.stringify(enrichedCollections)),
    } as CampaignProps
  };
}

interface CampaignProps {
  campaign: Campaign;
  enrichedCollections: EnrichedCollection[];
}

/* istanbul ignore next */
export default function CampaignPage({ campaign, enrichedCollections }: CampaignProps) {
  const getOptions = useCallback(() => {
    return enrichedCollections.map(enrichedCollections => {
      return {
        href: `/collection/${enrichedCollections.slug}`,
        id: enrichedCollections._id.toString(),
        stats: new SelectOptionStats(enrichedCollections.levelCount, enrichedCollections.userSolvedCount),
        text: enrichedCollections.name,
      } as SelectOption;
    });
  }, [enrichedCollections]);

  return (
    <Page
      folders={[new LinkInfo('Campaigns', '/campaigns')]}
      title={campaign.name}
    >
      <>
        <h1 className='text-2xl text-center pb-1 pt-3'>
          {campaign.name}
        </h1>
        {!campaign.authorNote ? null :
          <div className='p-2 text-center'>
            <FormattedAuthorNote authorNote={campaign.authorNote} />
          </div>
        }
        <Select options={getOptions()} prefetch={false} />
      </>
    </Page>
  );
}
