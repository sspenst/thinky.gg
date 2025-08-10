import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import useProStatsUser, { ProStatsUserType } from '../../hooks/useProStatsUser';
import User from '../../models/db/user';
import FormattedDate from '../formatted/formattedDate';
import FormattedLevelLink from '../formatted/formattedLevelLink';
import StyledTooltip from '../page/styledTooltip';
import { DataTableOffline } from '../tables/dataTable';

dayjs.extend(duration);

export default function ProfileInsightsRecords({ user }: {user: User}) {
  const { proStatsUser } = useProStatsUser(user, ProStatsUserType.Records);

  if (!proStatsUser || !proStatsUser[ProStatsUserType.Records]) {
    return (
      <div className='flex flex-col gap-4'>
        <div className='h-6 bg-gray-700 rounded w-48 animate-pulse' />
        <div className='bg-gray-800 rounded-lg p-4'>
          <div className='space-y-3'>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className='flex justify-between items-center'>
                <div className='h-4 bg-gray-700 rounded w-32 animate-pulse' />
                <div className='h-4 bg-gray-700 rounded w-24 animate-pulse' />
                <div className='h-4 bg-gray-700 rounded w-20 animate-pulse' />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const data = proStatsUser[ProStatsUserType.Records].sort((a, b) => {
    return b.records[0].ts - a.records[0].ts;
  });

  return (<>
    <h2 className='text-xl font-bold break-words max-w-full'>Level Records by {user.name}</h2>
    <div className='w-full'>
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
            selector: (row) => {
              if (row.records[0].ts <= row.ts) return 'N/A';

              const duration = dayjs.duration(((row.records[0].ts - row.ts) * 1000));
              const humanizedTime = duration.humanize();
              const isOlderThanYear = duration.asYears() >= 1;

              return (
                <div className='flex items-center gap-2'>
                  <span>{humanizedTime}</span>
                  {isOlderThanYear && (
                    <span
                      className='cursor-help'
                      data-tooltip-id='buried-treasure-tooltip'
                      data-tooltip-content='Buried Treasure'
                    >
                      🏜
                    </span>
                  )}
                </div>
              );
            },
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
      <StyledTooltip id='buried-treasure-tooltip' />
    </div>
  </>);
}
