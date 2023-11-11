import moment from 'moment';
import React, { useContext } from 'react';
import DataTable from 'react-data-table-component-sspenst';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import { DATA_TABLE_CUSTOM_STYLES } from '../../helpers/dataTableCustomStyles';
import useProStatsUser, { ProStatsUserType } from '../../hooks/useProStatsUser';
import User from '../../models/db/user';
import FormattedDate from '../formatted/formattedDate';
import FormattedLevelLink from '../formatted/formattedLevelLink';

export default function ProfileInsightsRecords({ user }: {user: User}) {
  const { proStatsUser } = useProStatsUser(user, ProStatsUserType.Records);
  const { user: reqUser } = useContext(AppContext);

  console.log(proStatsUser);

  if (!proStatsUser || !proStatsUser[ProStatsUserType.Records]) {
    return <span>Loading...</span>;
  }

  return (<>
    <h2 className='text-xl font-bold break-words max-w-full'>Level Records by {user.name}</h2>
    <div className='w-full max-w-lg'>
      <DataTable
        columns={[
          {
            name: 'Level',
            sortable: true,
            selector: (row) => row.name,
            cell: (row, index) => <FormattedLevelLink id={`play-log-${index}`} level={row} />,
            grow: 2,
          },

          {
            grow: 3,
            name: 'Time Between Level Creation and Record',
            sortable: true,
            cell: (row) => moment.duration(((row.records[0].ts - row.ts) * 1000) || 0).humanize(),
            selector: (row) => (row.records[0].ts - row.ts),

          },
        ]}

        customStyles={DATA_TABLE_CUSTOM_STYLES}
        data={proStatsUser[ProStatsUserType.Records]}
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
