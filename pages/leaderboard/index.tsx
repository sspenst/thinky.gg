import LeaderboardTable from '../../components/leaderboardTable';
import Page from '../../components/page';
import React from 'react';
import { SWRConfig } from 'swr';
import User from '../../models/db/user';
import { getLeaderboard, getTopReviewers } from '../api/leaderboard';
import getSWRKey from '../../helpers/getSWRKey';
import isOnline from '../../helpers/isOnline';
import useLeaderboard from '../../hooks/useLeaderboard';
import ReviewLeaderboardTable, { UserWithCount } from '../../components/reviewerLeaderboardTable';

export async function getStaticProps() {
  const users = await getLeaderboard();

  const topReviewers = await getTopReviewers();

  if (!users || !topReviewers) {
    throw new Error('Error finding Users');
  }

  return {
    props: {
      users: JSON.parse(JSON.stringify(users)),
      reviewers: JSON.parse(JSON.stringify(topReviewers)),
    } as LeaderboardProps,
    revalidate: 60,
  };
}

interface LeaderboardProps {
  users: User[];
  reviewers: UserWithCount[];
}

export default function Leaderboard({ users }: LeaderboardProps) {
  return (
    <SWRConfig value={{ fallback: { [getSWRKey('/api/leaderboard')]: users } }}>
      <LeaderboardPage/>
    </SWRConfig>
  );
}

function LeaderboardPage() {
  const { users, reviewers } = useLeaderboard();

  if (!users || !reviewers) {
    return null;
  }

  const currentlyOnlineCount = users.filter(user => isOnline(user)).length;

  return (
    <Page title={'Leaderboard'}>
      <>
        <div className='pt-4 px-4 flex flex-col items-center'>
          <h1>{`There ${currentlyOnlineCount !== 1 ? 'are' : 'is'} currently ${currentlyOnlineCount} user${currentlyOnlineCount !== 1 ? 's' : ''} online.`}</h1>
        </div>
        <div className='p-3 mt-8 flex flex-col-2 gap-12 justify-center'>
          <div>
            <h1>Top Level Completions</h1>
            <LeaderboardTable users={users} />
          </div>
          <div>
            <h1>Top Reviewers</h1>
            <ReviewLeaderboardTable users={reviewers} />
          </div>
        </div>
      </>
    </Page>
  );
}
