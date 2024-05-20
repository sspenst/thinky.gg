import UpsellFullAccount from '@root/components/home/upsellFullAccount';
import LoadingSpinner from '@root/components/page/loadingSpinner';
import PlayerRank from '@root/components/profile/playerRank';
import { AppContext } from '@root/contexts/appContext';
import { getGameFromId, getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import useSWRHelper from '@root/hooks/useSWRHelper';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import React, { useContext } from 'react';
import ChapterSelectCard from '../../../components/cards/chapterSelectCard';
import Page from '../../../components/page/page';
import { getUserFromToken } from '../../../lib/withAuth';
import User from '../../../models/db/user';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const gameId = getGameIdFromReq(context.req as NextApiRequest);
  const game = getGameFromId(gameId);

  if (!reqUser || game.disableCampaign) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {
      reqUser: JSON.parse(JSON.stringify(reqUser)),
    },
  };
}

interface PlayPageProps {
  reqUser: User;
}

/* istanbul ignore next */
export default function PlayPage({ reqUser }: PlayPageProps) {
  const { game } = useContext(AppContext);
  const chapterUnlocked = reqUser.config?.chapterUnlocked ?? 1;
  const { data: profileDataFetched } = useSWRHelper<{levelsSolvedByDifficulty: {[key: string]: number}}>('/api/user/' + reqUser?._id + '?type=levelsSolvedByDifficulty', {}, {});

  const levelsSolvedByDifficulty = profileDataFetched?.levelsSolvedByDifficulty;

  return (
    <Page title={'Play'}>
      <UpsellFullAccount user={reqUser} />
      <div className='flex flex-col items-center gap-2 px-2 mt-6'>
        <div className='font-bold text-3xl text-center' id='title'>
          {game.displayName} Official Campaign
        </div>
        <div className='text-center flex flex-row gap-3 bg-gray-600 rounded-lg p-2'>
          {
            levelsSolvedByDifficulty ?
              <><div className=''>Rank:</div>
                <PlayerRank levelsSolvedByDifficulty={levelsSolvedByDifficulty} user={reqUser} />
              </>
              : <LoadingSpinner />
          }
        </div>
      </div>
      <div className='flex flex-col items-center gap-6 p-4'>
        <ChapterSelectCard chapter={1} chapterUnlocked={chapterUnlocked} />
        <ChapterSelectCard chapter={2} chapterUnlocked={chapterUnlocked} />
        <ChapterSelectCard chapter={3} chapterUnlocked={chapterUnlocked} />
        {chapterUnlocked >= 3 && <ChapterSelectCard chapter={4} chapterUnlocked={chapterUnlocked} />}
      </div>
    </Page>
  );
}
