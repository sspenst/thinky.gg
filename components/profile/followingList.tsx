import React from 'react';
import User from '../../models/db/user';
import FollowButton from '../buttons/followButton';
import FormattedUser from '../formatted/formattedUser';
import DataTable from '../tables/dataTable';

interface FollowingListProps {
  users: User[];
}

export default function FollowingList({ users }: FollowingListProps) {
  return (
    <div className='flex flex-col items-center justify-center max-w-md'>
      <DataTable
        onChangePage={() => {}}
        onSort={() => {}}
        page={1}
        sortBy='user'
        sortDir='asc'
        totalItems={users.length}

        columns={[
          {
            id: 'user',
            name: 'User',
            selector: (row) => <FormattedUser user={row as User} />,
            sortable: false,
          },
          {
            id: 'follow',
            name: '',
            selector: (row) => <FollowButton isFollowing={true} user={row as User} />,
            sortable: false,
          },
        ]}
        itemsPerPage={10} // TODO - this doesn't seem to work... this data table component seems like it only works with server...
        data={users}
        noDataComponent={<div className='text-gray-500 dark:text-gray-400'>No users to show</div>}
      />
    </div>
  );
}
