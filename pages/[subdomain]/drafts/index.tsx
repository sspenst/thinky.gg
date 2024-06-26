import LevelCard from '@root/components/cards/levelCard';
import TimeRange from '@root/constants/timeRange';
import { blueButton } from '@root/helpers/className';
import { getGameFromId, getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { redirectToLogin } from '@root/helpers/redirectToLogin';
import classNames from 'classnames';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import React from 'react';
import Page from '../../../components/page/page';
import { getUserFromToken } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import User from '../../../models/db/user';
import { LevelModel } from '../../../models/mongoose';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const gameId = getGameIdFromReq(context.req);
  const game = getGameFromId(gameId);

  if (game.isNotAGame) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  if (!reqUser) {
    return redirectToLogin(context);
  }

  const levels = await LevelModel.find<Level>({
    isDeleted: { $ne: true },
    isDraft: true,
    userId: reqUser._id,
    gameId: gameId
  }).sort({ name: 1 });

  return {
    props: {
      levels: JSON.parse(JSON.stringify(levels)),
      user: JSON.parse(JSON.stringify(reqUser)),
    },
  };
}

export interface CreatePageProps {
  levels: Level[];
  user: User;
}

/* istanbul ignore next */
export default function Create({ levels, user }: CreatePageProps) {
  return (
    <Page title='Drafts'>
      <div className='flex flex-col gap-5 m-5 items-center'>
        <h1 className='text-3xl font-bold text-center'>
          Your Draft Levels
        </h1>
        <ul>
          <li>Create a new level and save your changes</li>
          <li><span className='font-bold'>Test</span> your level to set a step count</li>
          <li><span className='font-bold'>Publish</span> your level for everyone to play!</li>
          <li>You can unpublish or archive a level at any time</li>
        </ul>
        <div className='flex items-center flex-wrap justify-center gap-4'>
          <Link
            className={classNames('flex items-center gap-2', blueButton)}
            href='/create'
          >
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='2 2 20 20' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M12 4.5v15m7.5-7.5h-15' />
            </svg>
            <span>Create Level</span>
          </Link>
          <Link
            className='py-2 px-4 rounded-lg hover:bg-neutral-500'
            href={{
              pathname: '/search',
              query: {
                searchAuthor: user.name,
                sortBy: 'ts',
                timeRange: TimeRange[TimeRange.All],
              },
            }}
          >
            Your Published Levels
          </Link>
          <Link
            className='py-2 px-4 rounded-lg hover:bg-neutral-500'
            href={`/profile/${user.name}/collections`}
          >
            Your Collections
          </Link>
        </div>
        <div className='flex flex-wrap justify-center gap-4'>
          {levels.map(level => {
            return (
              <LevelCard
                href={`/edit/${level._id.toString()}`}
                id='draft-level'
                key={`draft-level-${level._id.toString()}`}
                level={level}
              />
            );
          })}
        </div>
      </div>
    </Page>
  );
}
