import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import React from 'react';
import FormattedCampaign from '../../components/formatted/formattedCampaign';
import LinkInfo from '../../components/formatted/linkInfo';
import Page from '../../components/page/page';
import getCampaignProps, { CampaignProps } from '../../helpers/getCampaignProps';
import { getUserFromToken } from '../../lib/withAuth';
import { UserModel } from '../../models/mongoose';

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
    return {
      redirect: {
        destination: '/play',
        permanent: false,
      },
    };
  } else if (chapterUnlocked === 2) {
    const { props } = await getCampaignProps(reqUser, 'chapter2');

    if (!props) {
      return {
        redirect: {
          destination: '/play',
          permanent: false,
        },
      };
    }

    const remainingLevels = Math.ceil(props.totalLevels * 0.75) - props.solvedLevels;
    const isChapter2Complete = remainingLevels <= 0 && props.enrichedCollections.filter(c => !c.isThemed).every(c => Math.ceil(c.levelCount * 0.5) - c.userSolvedCount <= 0);

    if (!isChapter2Complete) {
      return {
        redirect: {
          destination: '/play',
          permanent: false,
        },
      };
    }

    await UserModel.updateOne({ _id: reqUser._id }, { $set: { chapterUnlocked: 3 } });
    // TODO: unlock achievement here for completing chapter 2
  }

  return await getCampaignProps(reqUser, 'chapter3');
}

/* istanbul ignore next */
export default function Chapter3Page({ enrichedCollections, solvedLevels, totalLevels }: CampaignProps) {
  return (
    <Page folders={[new LinkInfo('Chapter Select', '/play')]} title={'Chapter 3'}>
      <FormattedCampaign
        enrichedCollections={enrichedCollections}
        hideUnlockRequirements={true}
        levelHrefQuery={'chapter=3'}
        solvedElement={
          <div className='flex flex-col items-center justify-center text-center mt-2'>
            <div>Congratulations! You&apos;ve solved every level in Chapter 3.</div>
            <div>If you&apos;re looking for more levels, try a campaign from the <Link className='font-bold underline' href='/campaigns' passHref>Campaigns</Link> page, or try browsing the <Link className='font-bold underline' href='/search' passHref>Search</Link> page.</div>
            <div>You could also try creating a level of your own on the <Link className='font-bold underline' href='/create' passHref>Create</Link> page.</div>
            <div>We hope you&apos;re enjoying Pathology!</div>
          </div>
        }
        solvedLevels={solvedLevels}
        subtitle={'Brain Busters'}
        title={'Chapter 3'}
        totalLevels={totalLevels}
      />
    </Page>
  );
}
