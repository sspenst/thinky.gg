import React, { useCallback, useEffect, useState } from 'react';
import Page from '../../components/Common/Page';
import User from '../../components/DataModels/Pathology/User';

interface LeaderboardEntry {
  completed: number;
  name: string;
}

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<[LeaderboardEntry]>();
  const [user, setUser] = useState<User>();

  useEffect(() => {
    async function getLeaderboard() {
      const response = await fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'leaderboard');
      const leaderboard = await response.json();
      leaderboard.sort((a: any, b: any) => a.completed < b.completed ? 1 : -1);
      setLeaderboard(leaderboard);
    }

    async function getUser() {
      const response = await fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'user', {credentials: 'include'});
      setUser(await response.json());
    }

    getLeaderboard();
    getUser();
  }, []);

  const generateLeaderboard = useCallback(() => {
    if (!leaderboard || !user) {
      return;
    }

    const rows = [];

    for (let i = 0; i < leaderboard.length; i++) {
      const name = leaderboard[i].name;
      const isYou = name === user.name;
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
