import React, { useCallback, useEffect, useState } from 'react';
import Page from '../../components/page';
import User from '../../models/data/pathology/user';

export async function getStaticProps() {
  const res = await fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'leaderboard');

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  const leaderboard: LeaderboardEntry[] = await res.json();
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
