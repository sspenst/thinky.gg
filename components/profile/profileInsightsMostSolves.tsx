import { UserAndSum } from '@root/contexts/levelContext';
import React, { useContext } from 'react';
import DataTable from 'react-data-table-component-sspenst';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import { DATA_TABLE_CUSTOM_STYLES } from '../../helpers/dataTableCustomStyles';
import useProStatsUser, { ProStatsUserType } from '../../hooks/useProStatsUser';
import User from '../../models/db/user';
import FormattedUser from '../formatted/formattedUser';

export default function ProfileInsightsMostSolves({ user }: {user: User}) {
  const { proStatsUser } = useProStatsUser(user, ProStatsUserType.MostSolvesForUserLevels);
  const { user: reqUser } = useContext(AppContext);

  if (!proStatsUser || !proStatsUser[ProStatsUserType.MostSolvesForUserLevels]) {
    return <span>Loading...</span>;
  }

  return (<>
    <h2 className='text-xl font-bold break-words max-w-full'>Most Solves of {user.name}&apos;s Levels</h2>
    <div className='w-full max-w-md'>
      <DataTable
        columns={[
          {
            name: 'User',
            cell: (row: UserAndSum) => <FormattedUser id='solves' size={Dimensions.AvatarSizeSmall} user={row.user} />,
            grow: 2,
          },
          {
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
        customStyles={DATA_TABLE_CUSTOM_STYLES}
        data={proStatsUser[ProStatsUserType.MostSolvesForUserLevels] as UserAndSum[]}
        dense
        noDataComponent={
          <div className='p-3'>
            Nothing to display...
          </div>
        }
        pagination={true}
        paginationComponentOptions={{
          noRowsPerPage: true,
        }}
        striped
      />
    </div>
  </>);
}