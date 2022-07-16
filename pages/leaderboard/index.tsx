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

  const users = await UserModel.find<User>({
    score: { $ne: 0 },
    ts: { $exists: true },
  }, 'calc_records name score ts');

  if (!users) {
    throw new Error('Error finding Users');
  }

  // Last 15 minutes
  const currently_online = await UserModel.countDocuments(
    {
      last_visited_at: {
        $gt: new Date().getTime() / 1000 - 15 * 60 * 1000,
      }
    },
  );

  return {
    props: {
      users: JSON.parse(JSON.stringify(users)),
      currently_online_count: currently_online
    } as LeaderboardProps,
    revalidate: 60,
  };
}

interface LeaderboardProps {
  users: User[];
  currently_online_count: number;
}

export default function Leaderboard({ users, currently_online_count }: LeaderboardProps) {
  return (
    <SWRConfig value={{ fallback: { [getSWRKey('/api/leaderboard')]: users } }}>
      <LeaderboardPage currently_online_count={currently_online_count}/>
    </SWRConfig>
  );
}

function LeaderboardPage({ currently_online_count }: { currently_online_count: number }) {
  const { users } = useLeaderboard();

  return (!users ? null :
    <Page title={'Leaderboard'}>
      <>
        <div className='p-3 flex flex-col items-center text-sm'>
        There are currently {currently_online_count} users online in last 15 minutes.
        </div>
        <LeaderboardTable users={users} />
      </>
    </Page>
  );
}
