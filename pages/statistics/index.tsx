import React from 'react';
import { SWRConfig } from 'swr';
import Page from '../../components/page';
import StatisticsTable from '../../components/statisticsTable';
import getFormattedDate from '../../helpers/getFormattedDate';
import getSWRKey from '../../helpers/getSWRKey';
import useStatistics from '../../hooks/useStatistics';
import Statistics from '../../models/statistics';
import { getStatistics } from '../api/statistics';

export async function getStaticProps() {
  const statistics = await getStatistics();

  if (!statistics) {
    throw new Error('Error finding statistics');
  }

  return {
    props: {
      statistics: JSON.parse(JSON.stringify(statistics)),
    } as StatisticsProps,
    revalidate: 60,
  };
}

interface StatisticsProps {
  statistics: Statistics;
}

/* istanbul ignore next */
export default function StatisticsSWR({ statistics }: StatisticsProps) {
  return (
    <SWRConfig value={{ fallback: { [getSWRKey('/api/statistics')]: statistics } }}>
      <StatisticsPage />
    </SWRConfig>
  );
}

/* istanbul ignore next */
function StatisticsPage() {
  const { statistics } = useStatistics();

  if (!statistics) {
    return null;
  }

  return (
    <Page title={'Statistics'}>
      <>
        <div className='pt-4 px-4 flex flex-col items-center text-sm'>
          <div>
            {`${statistics.currentlyOnlineCount.toLocaleString()} user${statistics.currentlyOnlineCount !== 1 ? 's' : ''} currently online!`}
          </div>
          <div>
            {`${statistics.registeredUsersCount.toLocaleString()} registered user${statistics.registeredUsersCount !== 1 ? 's' : ''}!`}
          </div>
          <div>
            {`${statistics.totalAttempts.toLocaleString()} total level attempt${statistics.totalAttempts !== 1 ? 's' : ''}!`}
          </div>
        </div>
        <div className='p-3 mt-4 flex flex-wrap flex-col-4 gap-6 justify-center'>
          <StatisticsTable
            columns = {[
              { name: 'Completions', format: user => user.score },
            ]}
            title='Top Level Completions'
            users={statistics.topScorers}
          />
          <StatisticsTable
            columns = {[
              { name: 'Records', format: user => user.calc_records },
            ]}
            title='Top Record Breakers'
            users={statistics.topRecordBreakers}
          />
          <StatisticsTable
            columns = {[
              { name: 'Reviews', format: user => user.reviewCount },
              { name: 'Avg Score', format: user => user.reviewAvg.toFixed(2) }
            ]}
            title='Top Reviewers'
            users={statistics.topReviewers}
          />
          <StatisticsTable
            columns = {[
              { name: 'Registered', format: user => user.ts ? getFormattedDate(user.ts) : '' },
            ]}
            title='Newest Users'
            users={statistics.newUsers}
          />
        </div>
      </>
    </Page>
  );
}
