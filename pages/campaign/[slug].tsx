import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback } from 'react';
import Select from '../../components/cards/select';
import formattedAuthorNote from '../../components/formatted/formattedAuthorNote';
import LinkInfo from '../../components/formatted/linkInfo';
import Page from '../../components/page/page';
import { enrichCollection } from '../../helpers/enrich';
import { logger } from '../../helpers/logger';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import Campaign from '../../models/db/campaign';
import { EnrichedCollection } from '../../models/db/collection';
import { CampaignModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';

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
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const campaign = await CampaignModel.findOne<Campaign>({ slug: slug })
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
    logger.error('CampaignModel.find returned null in pages/campaign');

    return {
      notFound: true,
    };
  }

  const enrichedCollections = await Promise.all(campaign.collections.map(collection => enrichCollection(collection, reqUser)));

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
        stats: new SelectOptionStats(enrichedCollections.levelCount, enrichedCollections.userCompletedCount),
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
          <div className='p-2'
            style={{
              textAlign: 'center',
            }}
          >
            {formattedAuthorNote(campaign.authorNote)}
          </div>
        }
        <Select options={getOptions()} prefetch={false} />
      </>
    </Page>
  );
}
