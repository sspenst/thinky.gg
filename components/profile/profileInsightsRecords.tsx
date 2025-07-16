import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import useProStatsUser, { ProStatsUserType } from '../../hooks/useProStatsUser';
import User from '../../models/db/user';
import FormattedDate from '../formatted/formattedDate';
import FormattedLevelLink from '../formatted/formattedLevelLink';
import { DataTableOffline } from '../tables/dataTable';

dayjs.extend(duration);

export default function ProfileInsightsRecords({ user }: {user: User}) {
  const { proStatsUser } = useProStatsUser(user, ProStatsUserType.Records);

  if (!proStatsUser || !proStatsUser[ProStatsUserType.Records]) {
    return <span>Loading...</span>;
  }

  const data = proStatsUser[ProStatsUserType.Records].sort((a, b) => {
    return b.records[0].ts - a.records[0].ts;
  });

  return (<>
    <h2 className='text-xl font-bold break-words max-w-full'>Level Records by {user.name}</h2>
    <div className='w-full max-w-lg'>
      <DataTableOffline
        columns={[
          {
            id: 'level',
            name: 'Level',
            selector: (row) => <FormattedLevelLink id={`play-log-${row._id}-${row.ts}`} level={row} />,
          },
          {
            id: 'date',
            name: 'Achieved',
            selector: (row) => <FormattedDate ts={row.records[0].ts} />,
          },
          {
            id: 'timeSinceCreation',
            name: 'Time Since Creation',
            selector: (row) => row.records[0].ts > row.ts ? dayjs.duration(((row.records[0].ts - row.ts) * 1000)).humanize() : 'N/A',
          },
        ]}
        data={data}
        itemsPerPage={10}
        noDataComponent={
          <div className='p-3'>
            Nothing to display...
          </div>
        }
      />
    </div>
  </>);
}
