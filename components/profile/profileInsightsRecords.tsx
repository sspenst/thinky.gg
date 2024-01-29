import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import React from 'react';
import DataTable from 'react-data-table-component-sspenst';
import { DATA_TABLE_CUSTOM_STYLES } from '../../helpers/dataTableCustomStyles';
import useProStatsUser, { ProStatsUserType } from '../../hooks/useProStatsUser';
import User from '../../models/db/user';
import FormattedDate from '../formatted/formattedDate';
import FormattedLevelLink from '../formatted/formattedLevelLink';

dayjs.extend(duration);

export default function ProfileInsightsRecords({ user }: {user: User}) {
  const { proStatsUser } = useProStatsUser(user, ProStatsUserType.Records);

  if (!proStatsUser || !proStatsUser[ProStatsUserType.Records]) {
    return <span>Loading...</span>;
  }

  return (<>
    <h2 className='text-xl font-bold break-words max-w-full'>Level Records by {user.name}</h2>
    <div className='w-full max-w-lg'>
      <DataTable
        defaultSortFieldId={'date'}
        defaultSortAsc={false}
        columns={[
          {
            name: 'Level',
            sortable: true,
            selector: (row) => row.name,
            cell: (row, index) => <FormattedLevelLink id={`play-log-${index}`} level={row} />,
            grow: 2,
          },

          {
            id: 'date',
            grow: 2,
            name: 'Achieved',
            sortable: true,
            cell: (row) => <FormattedDate ts={row.records[0].ts} />,
            selector: (row) => (row.records[0].ts),

          },
          {
            grow: 3,
            name: 'Time Since Creation',
            sortable: true,
            cell: (row) => row.records[0].ts > row.ts ? dayjs.duration(((row.records[0].ts - row.ts) * 1000)).humanize() : 'N/A',

            sortFunction: (a, b) => {
              const aDelta = a.records[0].ts - a.ts;
              const bDelta = b.records[0].ts - b.ts;

              return aDelta - bDelta;
            }

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
