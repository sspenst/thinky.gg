import { UserAndSum } from '@root/contexts/levelContext';
import React, { useContext } from 'react';
import DataTable from 'react-data-table-component';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import { DATA_TABLE_CUSTOM_STYLES } from '../../helpers/dataTableCustomStyles';
import useProStatsUser, { ProStatsUserType } from '../../hooks/useProStatsUser';
import User from '../../models/db/user';
import FormattedUser from '../formattedUser';

export default function ProfileInsightsMostCompletions({ user }: {user: User}) {
  const { proStatsUser: mostSolvesForUserLevels } = useProStatsUser(user, ProStatsUserType.MostSolvesForUserLevels);
  const { user: reqUser } = useContext(AppContext);

  if (!mostSolvesForUserLevels || !mostSolvesForUserLevels[ProStatsUserType.MostSolvesForUserLevels]) {
    return <span>Loading...</span>;
  }

  return (<>
    <h2 className='text-xl font-bold'>Most Completions of {user.name}&apos;s Levels</h2>
    <DataTable
      columns={[
        {
          name: 'User',
          cell: (row: UserAndSum) => <FormattedUser size={Dimensions.AvatarSizeSmall} user={row.user} />,
        },
        {
          name: 'Levels Completed',
          selector: (row) => row.sum,
        },
      ]}
      conditionalRowStyles={[{
        when: row => row.user._id === reqUser?._id,
        style: {
          backgroundColor: 'var(--bg-color-4)',
        },
      }]}
      customStyles={DATA_TABLE_CUSTOM_STYLES}
      data={mostSolvesForUserLevels[ProStatsUserType.MostSolvesForUserLevels]}
      dense
      noDataComponent={
        <div className='p-3'>
          Nothing to display...
        </div>
      }
      pagination={true}
      striped
    />
  </>);
}