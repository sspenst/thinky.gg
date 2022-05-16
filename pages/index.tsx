import React, { useCallback } from 'react';
import Dimensions from '../constants/dimensions';
import LatestLevelsTable from '../components/latestLevelsTable';
import Level from '../models/db/level';
import { LevelModel } from '../models/mongoose';
import Link from 'next/link';
import Page from '../components/page';
import Select from '../components/select';
import SelectOption from '../models/selectOption';
import User from '../models/db/user';
import dbConnect from '../lib/dbConnect';
import useUser from '../hooks/useUser';

export async function getStaticProps() {
  await dbConnect();
  
  const levels = await LevelModel.find<Level>({ isDraft: { $ne: true } })
    .populate<{userId: User}>('userId', '_id name')
    .sort({ ts: -1 })
    .limit(10);

  if (!levels) {
    throw new Error('Error finding Levels');
  }

  return {
    props: {
      levels: JSON.parse(JSON.stringify(levels)),
    } as AppProps,
    revalidate: 60 * 60,
  };
}

interface AppProps {
  levels: Level[];
}

export default function App({ levels }: AppProps) {
  const { isLoading, user } = useUser();

  const getOptions = useCallback(() => {
    return [
      new SelectOption('Play', '/catalog'),
      new SelectOption('Create', '/create', undefined, Dimensions.OptionHeight, undefined, undefined, isLoading || !user),
      new SelectOption('Leaderboard', '/leaderboard'),
    ];
  }, [isLoading, user]);

  return (
    <Page title={'Pathology'}>
      <>
        <div
          style={{
            margin: Dimensions.TableMargin,
            textAlign: 'center',
          }}
        >
          {'Welcome to Pathology! If you are a returning Psychopath player feel free to jump in and browse the full catalog of levels, but if you are new to the game the best way to start is with the '}
          <Link href={`/world/61ff23c45125afd1d9c0fc4c`} passHref>
            <a className='font-bold underline'>
              Psychopath Tutorial
            </a>
          </Link>
          {'. If you get stuck or want to discuss anything related to Pathology, join the community on the '}
          <a
            className='font-bold underline'
            href='https://discord.gg/j6RxRdqq4A'
            rel='noreferrer'
            target='_blank'
          >
            k2xl Discord
          </a>
          {'. Have fun!'}
        </div>
        <Select options={getOptions()}/>
        {!levels ? null : <>
          <div
            className='font-bold text-lg'
            style={{
              margin: Dimensions.TableMargin,
              textAlign: 'center',
            }}
          >
            Latest Levels:
          </div>
          <LatestLevelsTable levels={levels} />
        </>}
      </>
    </Page>
  );
}
