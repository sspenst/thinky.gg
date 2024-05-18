import UpsellFullAccount from '@root/components/home/upsellFullAccount';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import React from 'react';
import FormattedCampaign from '../../../components/formatted/formattedCampaign';
import LinkInfo from '../../../components/formatted/linkInfo';
import Page from '../../../components/page/page';
import getCampaignProps, { CampaignProps } from '../../../helpers/getCampaignProps';
import { getUserFromToken } from '../../../lib/withAuth';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const gameId = getGameIdFromReq(context.req);

  if (!reqUser) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return await getCampaignProps(gameId, reqUser, 'chapter1');
}

/* istanbul ignore next */
export default function Chapter1Page({ enrichedCollections, reqUser, solvedLevels, totalLevels }: CampaignProps) {
  return (
    <Page folders={[new LinkInfo('Play', '/play')]} title={'Chapter 1'}>
      <UpsellFullAccount user={reqUser} />
      <FormattedCampaign
        enrichedCollections={enrichedCollections}
        levelHrefQuery={'chapter=1'}
        nextHref={'/chapter2'}
        nextTitle={(reqUser.config?.chapterUnlocked ?? 1) < 2 ? 'Unlock Chapter 2' : undefined}
        solvedElement={
          <div className='flex flex-col items-center justify-center text-center mt-2'>
            <div>Congratulations! You&apos;ve solved every level in Chapter 1. Try out <Link className='font-bold underline' href='/chapter2' passHref>Chapter 2</Link> next!</div>
          </div>
        }
        solvedLevels={solvedLevels}
        subtitle={'Grassroots'}
        title={'Chapter 1'}
        totalLevels={totalLevels}
      />
    </Page>
  );
}
