import UpsellFullAccount from '@root/components/home/upsellFullAccount';
import { AppContext } from '@root/contexts/appContext';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import React, { useContext } from 'react';
import FormattedCampaign from '../../../components/formatted/formattedCampaign';
import LinkInfo from '../../../components/formatted/linkInfo';
import Page from '../../../components/page/page';
import getCampaignProps, { CampaignProps } from '../../../helpers/getCampaignProps';
import { getUserFromToken } from '../../../lib/withAuth';
import { UserConfigModel } from '../../../models/mongoose';

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

  const chapterUnlocked = reqUser.config?.chapterUnlocked ?? 1;

  if (chapterUnlocked === 1) {
    return {
      redirect: {
        destination: '/play',
        permanent: false,
      },
    };
  } else if (chapterUnlocked === 2) {
    const { props } = await getCampaignProps(gameId, reqUser, 'chapter2');

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

    await UserConfigModel.updateOne({ userId: reqUser._id, gameId: gameId }, { $set: { chapterUnlocked: 3 } });
    // TODO: unlock achievement here for completing chapter 2
  }

  const { props } = await getCampaignProps(gameId, reqUser, 'chapter3');

  if (!props) {
    return {
      redirect: {
        destination: '/play',
        permanent: false,
      },
    };
  }

  if (chapterUnlocked === 3) {
    const isChapter3Complete = props.totalLevels - props.solvedLevels <= 0;
    // TODO: unlock achievement here for completing chapter 2

    if (isChapter3Complete) {
      await UserConfigModel.updateOne({ userId: reqUser._id, gameId: gameId }, { $set: { chapterUnlocked: 4 } });
    }
  }

  return { props: props };
}

/* istanbul ignore next */
export default function Chapter3Page({ enrichedCollections, reqUser, solvedLevels, totalLevels }: CampaignProps) {
  const { game } = useContext(AppContext);

  return (
    <Page folders={[new LinkInfo('Play', '/play')]} title={'Chapter 3'}>
      <UpsellFullAccount user={reqUser} />
      <FormattedCampaign
        enrichedCollections={enrichedCollections}
        hideUnlockRequirements={true}
        levelHrefQuery={'chapter=3'}
        solvedElement={
          <div className='flex flex-col items-center justify-center text-center mt-2'>
            <div>Congratulations! You&apos;ve solved every level in Chapter 3.</div>
            <div>If you&apos;re looking for more levels, try {game.disableRanked ?
              <>browsing the <Link className='font-bold text-blue-500 hover:text-blue-400 transition' href='/search' passHref>Search</Link> page</> :
              <>playing <Link className='font-bold text-blue-500 hover:text-blue-400 transition' href='/ranked' passHref>Ranked 🏅</Link> levels</>
            } next, or try a campaign from the <Link className='font-bold text-blue-500 hover:text-blue-400 transition' href='/campaigns' passHref>Campaigns</Link> page.</div>
            <div>You could also try <Link className='font-bold text-blue-500 hover:text-blue-400 transition' href='/create' passHref>creating a level of your own</Link>.</div>
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
