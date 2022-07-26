import LeaderboardTable from '../../components/leaderboardTable';
import Page from '../../components/page';
import React from 'react';
import { SWRConfig } from 'swr';
import User from '../../models/db/user';
import { UserModel } from '../../models/mongoose';
import dbConnect from '../../lib/dbConnect';
import getSWRKey from '../../helpers/getSWRKey';
import getTs from '../../helpers/getTs';
import useLeaderboard from '../../hooks/useLeaderboard';

export async function getStaticProps() {
  await dbConnect();

  const users = await UserModel.find<User>({
    score: { $ne: 0 },
    ts: { $exists: true },
  }, 'avatarUpdatedAt calc_records name score ts');

  if (!users) {
    throw new Error('Error finding Users');
  }

  // Last 15 minutes
  const currentlyOnlineCount = await UserModel.countDocuments({
    last_visited_at: {
      $gt: getTs() - 15 * 60,
    }
  });

  return {
    props: {
      currentlyOnlineCount: currentlyOnlineCount,
      users: JSON.parse(JSON.stringify(users)),
    } as LeaderboardProps,
    revalidate: 60,
  };
}

interface LeaderboardProps {
  currentlyOnlineCount: number;
  users: User[];
}

export default function Leaderboard({ currentlyOnlineCount, users }: LeaderboardProps) {
  return (
    <SWRConfig value={{ fallback: { [getSWRKey('/api/leaderboard')]: users } }}>
      <LeaderboardPage currentlyOnlineCount={currentlyOnlineCount}/>
    </SWRConfig>
  );
}

interface LeaderboardPageProps {
  currentlyOnlineCount: number;
}

function LeaderboardPage({ currentlyOnlineCount }: LeaderboardPageProps) {
  const { users } = useLeaderboard();

  return (!users ? null :
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
