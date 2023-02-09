import { GetServerSidePropsContext, NextApiRequest } from 'next';
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

  const chapterUnlocked = reqUser.chapterUnlocked ?? 1;

  if (chapterUnlocked === 1) {
    const { props } = await getCampaignProps(reqUser, 'chapter1');

    if (!props) {
      return {
        redirect: {
          destination: '/chapterselect',
          permanent: false,
        },
      };
    }


    // check if user meets the requirements to unlock chapter 2
    // if yes, chapterUnlocked to 2
    // and unlock achievement in the future

    return {
      redirect: {
        destination: '/chapterselect',
        permanent: false,
      },
    };
  }

  return await getCampaignProps(reqUser, 'chapter2');
}

/* istanbul ignore next */
export default function Chapter2Page({ completedLevels, enrichedCollections, totalLevels }: CampaignProps) {
  return (
    <Page folders={[new LinkInfo('Chapter Select', '/chapterselect')]} title={'Chapter 2'}>
      <FormattedCampaign
        completedElement={
          <div className='flex flex-col items-center justify-center text-center mt-2'>
            <div>Congratulations! You&apos;ve completed every level in Chapter 2. Try out Chapter 3 next!</div>
          </div>
        }
        completedLevels={completedLevels}
        enrichedCollections={enrichedCollections}
        nextHref={'/chapter3'}
        nextTitle={'Chapter 3'}
        subtitle={'Into the Depths'}
        title={'Chapter 2'}
        totalLevels={totalLevels}
      />
    </Page>
  );
}
