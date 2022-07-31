import LeaderboardTable from '../../components/leaderboardTable';
import Page from '../../components/page';
import React from 'react';
import { SWRConfig } from 'swr';
import User from '../../models/db/user';
import { getDataForLeaderboardPage, getLeaderboard, getTopReviewers } from '../api/leaderboard';
import getSWRKey from '../../helpers/getSWRKey';
import isOnline from '../../helpers/isOnline';
import useLeaderboard from '../../hooks/useLeaderboard';
import ReviewLeaderboardTable, { UserWithCount } from '../../components/reviewerLeaderboardTable';
import BasicUserTable from '../../components/BasicUserTable';
import getFormattedDate from '../../helpers/getFormattedDate';

export async function getStaticProps() {
  const [topScorers, topRecordBreakers, topReviewers, currentlyOnlineCount, newUsers] = await getDataForLeaderboardPage();

  if (!topScorers || !topReviewers || !topRecordBreakers) {
    throw new Error('Error finding Users');
  }

  return {
    props: {
      topScorers: JSON.parse(JSON.stringify(topScorers)),
      topRecordBreakers: JSON.parse(JSON.stringify(topRecordBreakers)),
      topReviewers: JSON.parse(JSON.stringify(topReviewers)),
      currentlyOnlineCount: currentlyOnlineCount,
      newUsers: JSON.parse(JSON.stringify(newUsers)),
    } as LeaderboardProps,
    revalidate: 60,
  };
}

interface LeaderboardProps {
  topScorers: User[];
  topRecordBreakers: User[];
  topReviewers: UserWithCount[];
  currentlyOnlineCount: number;
  newUsers: User[];
}

export default function Leaderboard({ topScorers, topRecordBreakers, topReviewers, currentlyOnlineCount, newUsers }: LeaderboardProps) {
  return (
    <SWRConfig value={{ fallback: { [getSWRKey('/api/leaderboard')]: [topScorers, topRecordBreakers, topReviewers, currentlyOnlineCount, newUsers] } }}>

      <LeaderboardPage/>
    </SWRConfig>
  );
}

function LeaderboardPage() {
  const { topScorers, topRecordBreakers, topReviewers, currentlyOnlineCount, newUsers } = useLeaderboard();

  if (!topScorers || !topReviewers || !topRecordBreakers) {
    return null;
  }

  return (
    <Page title={'Leaderboard'}>
      <>
        <div className='pt-4 px-4 flex flex-col items-center'>
          <h1>{`There ${currentlyOnlineCount !== 1 ? 'are' : 'is'} currently ${currentlyOnlineCount} user${currentlyOnlineCount !== 1 ? 's' : ''} online.`}</h1>
        </div>
        <div className='p-3 mt-8 flex flex-wrap flex-col-4 gap-6 justify-center text-sm'>
          <div>
            <h1>Top Level Completions</h1>
            <BasicUserTable items={topScorers}
              columns = {[
                { name: 'Level Completions', format: (user:User) => user.score },
              ]}
            />
          </div>
          <div>
            <h1>Top Record Breakers</h1>
            <BasicUserTable items={topRecordBreakers}
              columns = {[
                { name: 'Level Records', format: (user:User) => user.calc_records },
              ]}
            />
          </div>
          <div>
            <h1>Top Reviewers</h1>
            <BasicUserTable items={topReviewers}
              columns = {[
                { name: 'Reviews Written', format: (user:UserWithCount) => user.count },
                { name: 'Avg Score', format: (user:UserWithCount) => user.avg.toFixed(2) }
              ]}
            />

          </div>
          <div>
            <h1>Newest Users</h1>
            <BasicUserTable items={newUsers}
              columns = {[
                { name: 'Registered', format: (user:User) => getFormattedDate(user.ts) }
              ]}
            />

          </div>
        </div>
      </>
    </Page>
  );
}
