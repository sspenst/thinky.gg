import { UserAndStatTs, UserLevelAndStatTs } from '@root/contexts/levelContext';
import React, { useContext } from 'react';
import DataTable from 'react-data-table-component-sspenst';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import { DATA_TABLE_CUSTOM_STYLES } from '../../helpers/dataTableCustomStyles';
import useProStatsUser, { ProStatsUserType } from '../../hooks/useProStatsUser';
import User from '../../models/db/user';
import EnrichedLevelLink from '../enrichedLevelLink';
import FormattedDate from '../formattedDate';
import FormattedUser from '../formattedUser';
import FormattedLevelInfo from '../level/info/formattedLevelInfo';

export default function ProfileInsightsLevelPlayLog({ user }: {user: User}) {
  const { proStatsUser } = useProStatsUser(user, ProStatsUserType.PlayLogForUserCreatedLevels);
  const { user: reqUser } = useContext(AppContext);

  if (!proStatsUser || !proStatsUser[ProStatsUserType.PlayLogForUserCreatedLevels]) {
    return <span>Loading...</span>;
  }

  return (<div className='flex flex-col'>
    <h2 className='text-xl font-bold break-words max-w-full'>Play Log for {user.name}&apos;s Levels</h2>
    <DataTable
      columns={[
        {
          name: 'User',
          cell: (row: UserLevelAndStatTs) => <FormattedUser size={Dimensions.AvatarSizeSmall} user={row.user} />,
        },
        {
          name: 'Level',
          cell: (row: UserLevelAndStatTs) => <EnrichedLevelLink level={row.levelId} />,
        },
        {
          name: 'When',
          // use moment js to show the date
          cell: (row) => <FormattedDate ts={row.statTs} />,
        },
      ]}
      conditionalRowStyles={[{
        when: row => row.user?._id === reqUser?._id,
        style: {
          backgroundColor: 'var(--bg-color-4)',
        },
      }]}
      // disable rows per page
      paginationComponentOptions={{
        noRowsPerPage: true,
      }}
      customStyles={DATA_TABLE_CUSTOM_STYLES}
      data={proStatsUser[ProStatsUserType.PlayLogForUserCreatedLevels]}
      dense
      noDataComponent={
        <div className='p-3'>
          Nothing to display...
        </div>
      }
      pagination={true}
      striped
    />
  </div>);
}
