import React from 'react';
import User from '../models/db/user';
import FollowButton from './followButton';
import FormattedUser from './formattedUser';

interface FollowingListProps {
  users: User[];
}

export default function FollowingList({ users }: FollowingListProps) {
  return (
    <div className='flex flex-col items-center justify-center'>
      <div>
        {users.map((user) => (
          <div className='grid grid-cols-2 gap-6 p-2' key={'following-list-row-' + user._id}>
            <FormattedUser user={user} />
            <FollowButton user={user} reqUserFollowing={true} />
          </div>
        ))}
      </div>
    </div>
  );
}
