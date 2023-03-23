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
      <h1 className='font-bold text-2xl'>Insights for {user.name}</h1>

      <div>
        <h2 className='text-xl'>Score Chart</h2>
        <div className='flex flex-row gap-2 justify-center align-center items-center'>
          <div>Compare with another user</div>
          <MultiSelectUser onSelect={
            (user) => {
              setCompareUser(user);
            }
          } />
        </div>
        {prostats && prostats[ProStatsUserType.ScoreHistory] && <ScoreChart key={user._id + '-scorechart'} user={user} compareUser={compareUser} compareData={compareData} scores={prostats[ProStatsUserType.ScoreHistory]} /> }
        {prostats && prostats[ProStatsUserType.DifficultyLevelsComparisons] && <DifficultyLevelsComparisonsChart key={user._id + '-difficultylevelcomparisonschart'} user={user} data={prostats[ProStatsUserType.DifficultyLevelsComparisons]} /> }
      </div>

    </div>

  );
};
