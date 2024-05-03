import { GameType } from '@root/constants/Games';
import { UserAndSum } from '@root/contexts/levelContext';
import React, { useContext } from 'react';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import useProStatsUser, { ProStatsUserType } from '../../hooks/useProStatsUser';
import User from '../../models/db/user';
import FormattedUser from '../formatted/formattedUser';
import { DataTableOffline } from '../tables/dataTable';

export default function ProfileInsightsMostSolves({ user }: {user: User}) {
  const { proStatsUser } = useProStatsUser(user, ProStatsUserType.MostSolvesForUserLevels);
  const { user: reqUser, game } = useContext(AppContext);

  if (!proStatsUser || !proStatsUser[ProStatsUserType.MostSolvesForUserLevels]) {
    return <span>Loading...</span>;
  }

  const difficultyType = game.type === GameType.SHORTEST_PATH ? 'Solve' : 'Completion';

  return (
    <div className='flex flex-col gap-1'>
      <h2 className='text-xl font-bold break-words max-w-full'>Most {difficultyType}s of {user.name}&apos;s Levels</h2>
      <div className='w-full max-w-md'>
        <DataTableOffline
          columns={[
            {
              id: 'user',
              name: 'User',
              selector: (row: UserAndSum) => <FormattedUser id='solves' size={Dimensions.AvatarSizeSmall} user={row.user} />,
            },
            {
              id: 'levelsSolved',
              name: 'Levels Solved',
              selector: (row) => row.sum,
            },
          ]}
          conditionalRowStyles={[{
            when: row => row.user._id === reqUser?._id,
            style: {
              backgroundColor: 'var(--bg-color-4)',
            },
          }]}
          data={proStatsUser[ProStatsUserType.MostSolvesForUserLevels] as UserAndSum[]}
          itemsPerPage={10}
          noDataComponent={
            <div className='p-3'>
              Nothing to display...
            </div>
          }
        />
      </div>
    </div>
  );
}
