import React, { useCallback, useEffect, useState } from 'react';
import Level from '../../models/data/pathology/level';
import LevelModel from '../../models/mongoose/levelModel';
import Page from '../../components/page';
import User from '../../models/data/pathology/user';
import UserModel from '../../models/mongoose/userModel';
import dbConnect from '../../lib/dbConnect';

export async function getStaticProps() {
  await dbConnect();

  const [levels, users] = await Promise.all([
    LevelModel.find<Level>(),
    UserModel.find<User>(),
  ]);

  if (!levels) {
    throw new Error('Error finding Levels');
  }
  
  if (!users) {
    throw new Error('Error finding Users');
  }

  const leastMoves: {[levelId: string]: number} = {};
  const leaderboard: LeaderboardEntry[] = [];

  for (let i = 0; i < levels.length; i++) {
    leastMoves[levels[i]._id.toString()] = levels[i].leastMoves;
  }

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const moves = user.getMoves();
    let completed = 0;

    for (const levelId in moves) {
      if (moves[levelId] <= leastMoves[levelId]) {
        completed++;
      }
    }

    leaderboard.push({
      completed: completed,
      name: user.name,
    });
  }

  leaderboard.sort((a: LeaderboardEntry, b: LeaderboardEntry) => a.completed < b.completed ? 1 : -1);

  return {
    props: {
      leaderboard,
    } as LeaderboardProps,
    revalidate: 10,
  };
}

interface LeaderboardEntry {
  completed: number;
  name: string;
}

interface LeaderboardProps {
  leaderboard: LeaderboardEntry[];
}

export default function Leaderboard({ leaderboard }: LeaderboardProps) {
  const [user, setUser] = useState<User>();

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'user', {credentials: 'include'})
    .then(async function(res) {
      setUser(await res.json());
    });
  }, []);

  const generateLeaderboard = useCallback(() => {
    const rows = [];

    for (let i = 0; i < leaderboard.length; i++) {
      const name = leaderboard[i].name;
      const isYou = user && name === user.name;
      rows.push(
        <div key={i}>
          {i+1}. <span className={isYou ? 'underline' : ''}>{name}</span> - {leaderboard[i].completed}
        </div>
      )
    }

    return rows;
  }, [leaderboard, user]);

  return (
    <Page escapeHref={'/'} title={'Leaderboard'}>
      <>
        <span className='font-semibold'>LEADERBOARD</span>
        <br/>
        {generateLeaderboard()}
      </>
    </Page>
  );
}
