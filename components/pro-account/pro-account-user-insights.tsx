import { UserAndSum } from '@root/contexts/levelContext';
import React, { useContext, useState } from 'react';
import DataTable, { Selector } from 'react-data-table-component';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import { DATA_TABLE_CUSTOM_STYLES } from '../../helpers/dataTableCustomStyles';
import useProStatsUser, { ProStatsUser, ProStatsUserType } from '../../hooks/useProStatsUser';
import User from '../../models/db/user';
import FormattedUser from '../formattedUser';
import MultiSelectUser from '../multiSelectUser';
import { DifficultyLevelsComparisonsChart } from './difficultyLevelsComparisonChart';
import { ScoreChart } from './scoreChart';

export const ProAccountUserInsights = ({ user }: {user: User}) => {
  const [compareUser, setCompareUser] = useState<User | null>(null);
  const { proStatsUser: scoreChartData } = useProStatsUser(user, ProStatsUserType.ScoreHistory);
  const { proStatsUser: compareUserData } = useProStatsUser(compareUser, ProStatsUserType.ScoreHistory);
  const { proStatsUser: difficultyComparisonData } = useProStatsUser(user, ProStatsUserType.DifficultyLevelsComparisons);
  const { proStatsUser: mostSolvesForUserLevels } = useProStatsUser(user, ProStatsUserType.MostSolvesForUserLevels);
  const { user: reqUser } = useContext(AppContext);
  const prostats = {
    ...scoreChartData,
    ...difficultyComparisonData,
    ...mostSolvesForUserLevels,
  } as ProStatsUser;
  const compareData = compareUserData?.[ProStatsUserType.ScoreHistory];

  if (!prostats) return (<div>Loading...</div>);

  const FormattedUserCell: React.FC<{ row: UserAndSum }> = ({ row }) => {
    return (
      <FormattedUser size={Dimensions.AvatarSizeSmall} user={row.user} />
    );
  };

  return (
    <div className='text-center'>
      <h1 className='font-bold text-3xl'>Insights for {user.name}</h1>

      <div className='mt-4'>

        {prostats && prostats[ProStatsUserType.ScoreHistory] && prostats[ProStatsUserType.ScoreHistory].length > 0 && (
          <>
            <h2 className='text-xl'>Score Chart</h2>
            <p className='text-xs mx-auto'>
              This chart shows the daily & cumulative completions over last 90 days for {user.name}.<br />You can compare this to another user by selecting them below.
            </p>
            <div className='flex flex-row gap-2 justify-center align-center items-center p-1'>

              <MultiSelectUser placeholder='Find a user to compare' onSelect={
                (user) => {
                  setCompareUser(user);
                }
              } />
            </div>
            <ScoreChart key={user._id + '-scorechart'} user={user} compareUser={compareUser} compareData={compareData} scores={prostats[ProStatsUserType.ScoreHistory]} />

          </>
        )}
        {prostats && prostats[ProStatsUserType.DifficultyLevelsComparisons] && prostats[ProStatsUserType.DifficultyLevelsComparisons].length > 0 && (
          <>
            <h1 className='text-xl text-center'>Difficulty Level Comparisons</h1>
            <p className='text-xs mx-auto'>
              This chart shows the delta of the level difficulties for the last that {user.name} has solved in the last 6 months (max 500).
              <br />Green/Red indicates that it took {user.name} more time to solve the level than the average user.
            </p>
            <DifficultyLevelsComparisonsChart key={user._id + '-difficultylevelcomparisonschart'} user={user} data={prostats[ProStatsUserType.DifficultyLevelsComparisons]} />
          </>
        )}
      </div>
      {prostats && prostats[ProStatsUserType.MostSolvesForUserLevels] && prostats[ProStatsUserType.MostSolvesForUserLevels].length > 0 && (
        <>
          <h1 className='text-xl text-center'>Creator Insights: Users Who Have Solved Most Levels by {user.name}</h1>
          <DataTable key={user._id + '-mostsolvesforuserlevels'}
            customStyles={DATA_TABLE_CUSTOM_STYLES}
            dense
            pagination={true}
            conditionalRowStyles={[{
              when: row => row.user._id === reqUser?._id,
              style: {
                backgroundColor: 'var(--bg-color-4)',
              },
            }]}
            noDataComponent={
              <div className='p-3'>
                Nothing to display...
              </div>
            }
            columns={[
              {
                name: 'User',
                cell: (row: UserAndSum) => <FormattedUserCell row={row} />,
              },
              {
                name: 'Levels Completed',
                selector: (row) => row.sum,
              },

            ]} data={prostats[ProStatsUserType.MostSolvesForUserLevels]} />

        </>
      )}

    </div>

  );
};
