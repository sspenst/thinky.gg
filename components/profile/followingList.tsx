import Dimensions from '@root/constants/dimensions';
import Graph from '@root/models/db/graph';
import React from 'react';
import User from '../../models/db/user';
import FollowButton from '../buttons/followButton';
import FormattedDate from '../formatted/formattedDate';
import FormattedUser from '../formatted/formattedUser';
import { DataTableOffline } from '../tables/dataTable';

interface FollowingListProps {
  graphs: Graph[];
}

export default function FollowingList({ graphs }: FollowingListProps) {
  return (
    <div className='flex flex-col items-center justify-center max-w-md'>
      <DataTableOffline
        columns={[
          {
            id: 'user',
            name: 'User',
            selector: (row) => <FormattedUser id='following' size={Dimensions.AvatarSizeSmall} user={row.target as User} />,
            sortable: false,
          },
          {
            id: 'follow',
            name: '',
            selector: (row) => <FollowButton isFollowing={true} user={row.target as User} />,
            sortable: false,
          },
          {
            id: 'when-follow',
            name: 'Date Followed',
            selector: (row) => <FormattedDate date={row.createdAt} />,
            sortable: false,
          },
        ]}
        data={graphs}
        itemsPerPage={10}
        noDataComponent={<div className='text-gray-500 dark:text-gray-400'>No users to show</div>}
      />
    </div>
  );
}
