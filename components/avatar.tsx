import React from 'react';
import User from '../models/db/user';
import getTs from '../helpers/getTs';
import useUser from '../hooks/useUser';

interface AvatarProps {
  hideStatus?: boolean;
  size: number;
  user: User;
}

export default function Avatar({ hideStatus, size, user }: AvatarProps) {
  const loggedInUser = useUser();

  let isOnline = false;

  if (!user.hideStatus) {
    if (loggedInUser.user?._id === user._id) {
      isOnline = true;
    } else {
      const onlineThreshold = getTs() - 15 * 60;
      const lastVisitedAt = user.last_visited_at ?? 0;

      isOnline = lastVisitedAt > onlineThreshold;
    }
  }

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
      {!hideStatus &&
        <span
          style={{
            backgroundColor: isOnline ? 'var(--color-complete)' : 'var(--bg-color-4)',
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
