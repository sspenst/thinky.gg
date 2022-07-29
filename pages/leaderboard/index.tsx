import LeaderboardTable from '../../components/leaderboardTable';
import Page from '../../components/page';
import React from 'react';
import { SWRConfig } from 'swr';
import User from '../../models/db/user';
import dbConnect from '../../lib/dbConnect';
import { getLeaderboard } from '../api/leaderboard';
import getSWRKey from '../../helpers/getSWRKey';
import isOnline from '../../helpers/isOnline';
import useLeaderboard from '../../hooks/useLeaderboard';

export async function getStaticProps() {
  await dbConnect();

  const users = await getLeaderboard();

  if (!users) {
    throw new Error('Error finding Users');
  }

  return {
    props: {
      users: JSON.parse(JSON.stringify(users)),
    } as LeaderboardProps,
    revalidate: 60,
  };
}

interface LeaderboardProps {
  users: User[];
}

export default function Leaderboard({ users }: LeaderboardProps) {
  return (
    <SWRConfig value={{ fallback: { [getSWRKey('/api/leaderboard')]: users } }}>
      <LeaderboardPage/>
    </SWRConfig>
  );
}

function LeaderboardPage() {
  const { users } = useLeaderboard();

  if (!users) {
    return null;
  }

  const currentlyOnlineCount = users.filter(user => isOnline(user)).length;

  return (
    <Page title={'Leaderboard'}>
      <>
        <div className='pt-4 px-4 flex flex-col items-center text-sm'>
          {`There ${currentlyOnlineCount !== 1 ? 'are' : 'is'} currently ${currentlyOnlineCount} user${currentlyOnlineCount !== 1 ? 's' : ''} online.`}
        </div>
        <LeaderboardTable users={users} />
      </>
    </Page>
  );
}
