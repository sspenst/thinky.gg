import React from 'react';
import User from '../models/db/user';
import FollowButton from './FollowButton';
import FormattedUser from './formattedUser';

export default function FollowingList({ followedUsers }: {followedUsers: User[]}) {
  return (
    <div>
      <h2 className='text-xl'>{followedUsers.length > 0 ? 'Following' : 'Not following anyone'}</h2>

      {followedUsers.map((user) => (
        <div className='grid grid-cols-2 gap-6 p-2' key={'row-' + user._id}>
          <FormattedUser key={'following-list-' + user._id.toString()} user={user} />
          <FollowButton user={user} reqUserFollowing={true} />
        </div>
      ))}
    </div>
  );
}
