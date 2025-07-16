import { useContext } from 'react';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import useProStatsUser, { ProStatsUserType } from '../../hooks/useProStatsUser';
import User from '../../models/db/user';
import FormattedDate from '../formatted/formattedDate';
import FormattedLevelLink from '../formatted/formattedLevelLink';
import FormattedUser from '../formatted/formattedUser';
import { DataTableOffline } from '../tables/dataTable';

export default function ProfileInsightsLevelPlayLog({ user }: {user: User}) {
  const { proStatsUser } = useProStatsUser(user, ProStatsUserType.PlayLogForUserCreatedLevels);
  const { user: reqUser } = useContext(AppContext);

  if (!proStatsUser || !proStatsUser[ProStatsUserType.PlayLogForUserCreatedLevels]) {
    return <span>Loading...</span>;
  }

  const data = proStatsUser[ProStatsUserType.PlayLogForUserCreatedLevels];

  return (
    <div className='flex flex-col gap-1'>
      <h2 className='text-xl font-bold break-words max-w-full'>Play Log for {user.name}&apos;s Levels</h2>
      <div className='w-full max-w-lg'>
        <DataTableOffline
          columns={[
            {
              id: 'user',
              name: 'User',
              selector: (row) => <FormattedUser id={`play-log-${row.user?._id}-${row.levelId}`} size={Dimensions.AvatarSizeSmall} user={row.user} />,
            },
            {
              id: 'level',
              name: 'Level',
              selector: (row) => <FormattedLevelLink id={`play-log-${row.user?._id}-${row.levelId}`} level={row.levelId} />,
            },
            {
              id: 'when',
              name: 'When',
              selector: (row) => <FormattedDate ts={row.statTs} />,
            },
          ]}
          conditionalRowStyles={[{
            when: row => row.user?._id === reqUser?._id,
            style: {
              backgroundColor: 'var(--bg-color-4)',
            },
          }]}
          data={data}
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
