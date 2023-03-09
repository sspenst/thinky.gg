import React, { useContext } from 'react';
import Dimensions from '../constants/dimensions';
import { PageContext } from '../contexts/pageContext';
import isOnline from '../helpers/isOnline';
import User from '../models/db/user';

interface AvatarProps {
  hideStatusCircle?: boolean;
  size?: number;
  user: User;
}

export default function Avatar({ hideStatusCircle, size, user }: AvatarProps) {
  const { user: loggedInUser } = useContext(PageContext);
  // ensure logged in user's status always updates instantly
  // (last_visited_at may not be immediately up to date)
  const online = loggedInUser?._id === user._id ? !user.hideStatus : isOnline(user);
  const _size = size ?? Dimensions.AvatarSize;

  return (
    <div className='flex items-end'>
      <span
        className='border'
        style={{
          backgroundImage: user.avatarUpdatedAt ? `url("/api/avatar/${user._id}.png?ts=${user.avatarUpdatedAt}")` : 'url("/avatar_default.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderColor: 'var(--bg-color-3)',
          borderRadius: _size / 2,
          height: _size,
          width: _size,
        }}
      />
      {!hideStatusCircle &&
        <span
          style={{
            backgroundColor: online ? 'var(--color-complete)' : 'var(--bg-color-4)',
            borderColor: 'var(--bg-color)',
            borderRadius: _size / 6,
            borderWidth: Math.round(_size / 40) || 1,
            height: _size / 3,
            marginLeft: -(_size / 3),
            width: _size / 3,
          }}
        />
      }
    </div>
  );
}
