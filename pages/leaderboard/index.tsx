import React, { useEffect, useState } from 'react';
import LeaderboardTable from '../../components/leaderboardTable';
import Page from '../../components/page';
import User from '../../models/data/pathology/user';
import UserModel from '../../models/mongoose/userModel';
import dbConnect from '../../lib/dbConnect';

export async function getStaticProps() {
  await dbConnect();
  
  const users = await UserModel.find<User>({}, 'name score');

  if (!users) {
    throw new Error('Error finding Users');
  }

  users.sort((a: User, b: User) => a.score < b.score ? 1 : -1);

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
  const [user, setUser] = useState<User>();

  useEffect(() => {
    fetch('/api/user', { credentials: 'include' })
    .then(async function(res) {
      setUser(await res.json());
    });
  }, []);

  return (
    <Page escapeHref={'/'} title={'Leaderboard'}>
      <LeaderboardTable user={user} users={users} />
    </Page>
  );
}
