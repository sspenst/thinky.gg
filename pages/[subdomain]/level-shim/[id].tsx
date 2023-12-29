import GameLayout from '@root/components/level/gameLayout';
import Grid from '@root/components/level/grid';
import Page from '@root/components/page/page';
import { initGameState } from '@root/helpers/gameStateHelpers';
import Level from '@root/models/db/level';
import { LevelModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import { GetServerSidePropsContext } from 'next';
import React from 'react';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { id } = context.params as { id: string };

  if (!Types.ObjectId.isValid(id)) {
    return {
      notFound: true,
    };
  }

  const lvl = await LevelModel.findById(id, { data: 1 }, { lean: true });

  if (!lvl) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      level: JSON.parse(JSON.stringify(lvl)),
    },
  };
}

export default function LevelShim({ level }: { level: Level }) {
  const gameState = initGameState(level.data);

  return <main className='grow h-full'>
    <div className='flex flex-col justify-center text-center w-full' style={{
      height: '50vh',
    }}>
      <Grid disableAnimation hideText={true} id={level._id.toString()} leastMoves={0} gameState={gameState} />
    </div>
  </main>;
}
