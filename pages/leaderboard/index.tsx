import LeaderboardTable from '../../components/leaderboardTable';
import Page from '../../components/page';
import React from 'react';
import User from '../../models/data/pathology/user';
import UserModel from '../../models/mongoose/userModel';
import dbConnect from '../../lib/dbConnect';
import useUser from '../../components/useUser';

export async function getServerSideProps() {
  await dbConnect();
  
  const users = await UserModel.find<User>({}, 'name score').sort({ score: -1 });

  if (!users) {
    throw new Error('Error finding Users');
  }

  return {
    props: {
      users: JSON.parse(JSON.stringify(users)),
    } as LeaderboardProps,
  };
}

interface LeaderboardProps {
  users: User[];
}

export default function Leaderboard({ users }: LeaderboardProps) {
  const { user } = useUser();

  return (
    <Page escapeHref={'/'} title={'Leaderboard'}>
      <LeaderboardTable user={user} users={users} />
    </Page>
  );
}
