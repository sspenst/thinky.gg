import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import React from 'react';
import FormattedCampaign from '../../components/formattedCampaign';
import LinkInfo from '../../components/linkInfo';
import Page from '../../components/page';
import getCampaignProps, { CampaignProps } from '../../helpers/getCampaignProps';
import { getUserFromToken } from '../../lib/withAuth';

export async function getServerSideProps(context: GetServerSidePropsContext) {
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

  return await getCampaignProps(reqUser, 'chapter3');
}

/* istanbul ignore next */
export default function Chapter3Page({ completedLevels, enrichedCollections, totalLevels }: CampaignProps) {
  return (
    <Page folders={[new LinkInfo('Chapter Select', '/chapterselect')]} title={'Chapter 3'}>
      <FormattedCampaign
        completedElement={
          <div className='flex flex-col items-center justify-center text-center mt-2'>
            <div>Congratulations! You&apos;ve completed every level in Chapter 3.</div>
            <div>If you&apos;re looking for more levels, try a campaign from the <Link className='font-bold underline' href='/campaigns' passHref>Campaigns</Link> page, or try browsing the <Link className='font-bold underline' href='/search' passHref>Search</Link> page.</div>
            <div>You could also try creating a level of your own on the <Link className='font-bold underline' href='/create' passHref>Create</Link> page.</div>
            <div>We hope you&apos;re enjoying Pathology!</div>
          </div>
        }
        completedLevels={completedLevels}
        enrichedCollections={enrichedCollections}
        hideUnlockRequirements={true}
        subtitle={'Brain Busters'}
        title={'Chapter 3'}
        totalLevels={totalLevels}
      />
    </Page>
  );
}
