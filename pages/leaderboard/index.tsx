import LeaderboardTable from '../../components/leaderboardTable';
import Page from '../../components/page';
import React from 'react';
import { SWRConfig } from 'swr';
import User from '../../models/db/user';
import { UserModel } from '../../models/mongoose';
import dbConnect from '../../lib/dbConnect';
import getSWRKey from '../../helpers/getSWRKey';
import useLeaderboard from '../../hooks/useLeaderboard';

export async function getStaticProps() {
  await dbConnect();
  
  const users = await UserModel.find<User>({ score: { $ne: 0 }}, 'name score').sort({ score: -1 });

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

  return (!users ? null :
    <Page title={'Leaderboard'}>
      <LeaderboardTable users={users} />
    </Page>
  );
}
