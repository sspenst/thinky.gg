import React from 'react';
import User from '../models/db/user';
import FollowButton from './followButton';
import FormattedUser from './formattedUser';

interface FollowingListProps {
  users: User[];
}

export default function FollowingList({ users }: FollowingListProps) {
  return (
    <div className='flex flex-col items-center justify-center max-w-md'>
      <div>
        {users.map((user) => (
          <div className='grid gap-6 p-2' key={'following-list-row-' + user._id} style={{
            gridTemplateColumns: '1fr auto'
          }}>
            <FormattedUser user={user} />
            <FollowButton isFollowing={true} user={user} />
          </div>
        ))}
      </div>
    </div>
  );
}
