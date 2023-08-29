import React, { useContext } from 'react';
import DataTable from 'react-data-table-component-sspenst';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import { DATA_TABLE_CUSTOM_STYLES } from '../../helpers/dataTableCustomStyles';
import useProStatsUser, { ProStatsUserType } from '../../hooks/useProStatsUser';
import User from '../../models/db/user';
import FormattedLevelLink from '../formatted/formattedLevelLink';
import FormattedDate from '../formatted/formattedDate';
import FormattedUser from '../formatted/formattedUser';

export default function ProfileInsightsLevelPlayLog({ user }: {user: User}) {
  const { proStatsUser } = useProStatsUser(user, ProStatsUserType.PlayLogForUserCreatedLevels);
  const { user: reqUser } = useContext(AppContext);

  if (!proStatsUser || !proStatsUser[ProStatsUserType.PlayLogForUserCreatedLevels]) {
    return <span>Loading...</span>;
  }

  return (<>
    <h2 className='text-xl font-bold break-words max-w-full'>Play Log for {user.name}&apos;s Levels</h2>
    <div className='w-full max-w-lg'>
      <DataTable
        columns={[
          {
            name: 'User',
            cell: (row) => <FormattedUser size={Dimensions.AvatarSizeSmall} user={row.user} />,
            grow: 2,
          },
          {
            name: 'Level',
            cell: (row) => <FormattedLevelLink level={row.levelId} />,
            grow: 2,
          },
          {
            name: 'When',
            cell: (row) => <FormattedDate ts={row.statTs} />,
          },
        ]}
        conditionalRowStyles={[{
          when: row => row.user?._id === reqUser?._id,
          style: {
            backgroundColor: 'var(--bg-color-4)',
          },
        }]}
        customStyles={DATA_TABLE_CUSTOM_STYLES}
        data={proStatsUser[ProStatsUserType.PlayLogForUserCreatedLevels] as any[]}
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
