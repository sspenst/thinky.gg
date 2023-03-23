import React, { useState } from 'react';
import useProStatsUser, { ProStatsUser, ProStatsUserType } from '../../hooks/useProStatsUser';
import User from '../../models/db/user';
import MultiSelectUser from '../multiSelectUser';
import { DifficultyLevelsComparisonsChart } from './difficultyLevelsComparisonChart';
import { ScoreChart } from './scoreChart';

export const ProAccountUserInsights = ({ user }: {user: User}) => {
  const [compareUser, setCompareUser] = useState<User | null>(null);
  const { data: scoreChartData } = useProStatsUser(user, ProStatsUserType.ScoreHistory);
  const { data: compareUserData } = useProStatsUser(compareUser, ProStatsUserType.ScoreHistory);
  const { data: difficultyComparisonData } = useProStatsUser(user, ProStatsUserType.DifficultyLevelsComparisons);
  const prostats = {
    ...scoreChartData,
    ...difficultyComparisonData
  } as ProStatsUser;
  const compareData = compareUserData?.[ProStatsUserType.ScoreHistory];

  if (!prostats) return (<div>Loading...</div>);

  return (
    <div className='text-center'>
      <h1 className='font-bold text-3xl'>Insights for {user.name}</h1>

      <div className='mt-4'>

        {prostats && prostats[ProStatsUserType.ScoreHistory] && (
          <>
            <h2 className='text-xl'>Score Chart</h2>
            <p className='text-xs mx-auto'>
              This chart shows the cumulative score over time for {user.name}.<br />You can compare this to another user by selecting them below.
            </p>
            <div className='flex flex-row gap-2 justify-center align-center items-center'>

              <MultiSelectUser onSelect={
                (user) => {
                  setCompareUser(user);
                }
              } />
            </div>
            <ScoreChart key={user._id + '-scorechart'} user={user} compareUser={compareUser} compareData={compareData} scores={prostats[ProStatsUserType.ScoreHistory]} />

          </>
        )}
        {prostats && prostats[ProStatsUserType.DifficultyLevelsComparisons] && (
          <>
            <h1 className='text-xl text-center'>Difficulty Level Comparisons</h1>
            <p className='text-xs mx-auto'>
              This chart shows the delta of the level difficulties for the last 100 levels that {user.name} has solved.
              <br />Green/Red indicates that it took {user.name} more time to solve the level than the average user.
            </p>
            <DifficultyLevelsComparisonsChart key={user._id + '-difficultylevelcomparisonschart'} user={user} data={prostats[ProStatsUserType.DifficultyLevelsComparisons]} />
          </>
        )}
      </div>

    </div>

  );
};
