import Dimensions from '@root/constants/dimensions';
import { IsFollowingGraph } from '@root/pages/[subdomain]/profile/[name]/[[...tab]]';
import React from 'react';
import User from '../../models/db/user';
import FollowButton from '../buttons/followButton';
import FormattedDate from '../formatted/formattedDate';
import FormattedUser from '../formatted/formattedUser';
import { DataTableOffline } from '../tables/dataTable';

interface FollowingListProps {
  isFollowingGraphs: IsFollowingGraph[];
}

export default function FollowingList({ isFollowingGraphs }: FollowingListProps) {
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
            selector: (row) => <FollowButton isFollowing={row.isFollowing} user={row.target as User} />,
            sortable: false,
          },
          {
            id: 'when-follow',
            name: 'Date Followed',
            selector: (row) => <FormattedDate date={row.createdAt} />,
            sortable: false,
          },
        ]}
        data={isFollowingGraphs}
        itemsPerPage={10}
        noDataComponent={<div className='text-gray-500 dark:text-gray-400'>No users to show</div>}
      />
    </div>
  );
}
