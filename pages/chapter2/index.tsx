import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import React from 'react';
import FormattedCampaign from '../../components/formattedCampaign';
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

  return await getCampaignProps(reqUser, 'chapter2');
}

/* istanbul ignore next */
export default function Chapter2Page({ completedLevels, enrichedCollections, totalLevels }: CampaignProps) {
  return (
    <Page title={'Chapter 2'}>
      <FormattedCampaign
        completedElement={
          <div className='flex flex-col items-center justify-center text-center mt-2'>
            <div>Congratulations! You&apos;ve completed every level in Chapter 2. Try out <Link className='font-bold underline' href='/chapter3' passHref>Chapter 3</Link> next!</div>
          </div>
        }
        completedLevels={completedLevels}
        enrichedCollections={enrichedCollections}
        subtitle={'Into the Depths'}
        title={'Chapter 2'}
        totalLevels={totalLevels}
        unlockRequirements={{}}
      />
    </Page>
  );
}
