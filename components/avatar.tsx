import React from 'react';
import User from '../models/db/user';
import isOnline from '../helpers/isOnline';
import useUser from '../hooks/useUser';

interface AvatarProps {
  hideStatusCircle?: boolean;
  size: number;
  user: User;
}

export default function Avatar({ hideStatusCircle, size, user }: AvatarProps) {
  const loggedInUser = useUser();
  // NB: ensure logged in user's status always updates instantly
  // (last_visited_at may not be immediately up to date)
  const online = loggedInUser.user?._id === user._id ? !user.hideStatus : isOnline(user);

  return (
    <div className='flex items-end'>
      <span
        className='border'
        style={{
          backgroundImage: user.avatarUpdatedAt ? `url("/api/avatar/${user._id}.png?ts=${user.avatarUpdatedAt}")` : 'url("/avatar_default.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderColor: 'var(--bg-color-3)',
          borderRadius: size / 2,
          height: size,
          width: size,
        }}
      />
      {!hideStatusCircle &&
        <span
          style={{
            backgroundColor: online ? 'var(--color-complete)' : 'var(--bg-color-4)',
            borderColor: 'var(--bg-color)',
            borderRadius: size / 6,
            borderWidth: Math.round(size / 40) || 1,
            height: size / 3,
            marginLeft: -(size / 3),
            width: size / 3,
          }}
        />
      }
    </div>
  );
}
