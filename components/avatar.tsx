import React from 'react';
import User from '../models/db/user';

interface AvatarProps {
  size: number;
  user: User;
}

export default function Avatar({ size, user }: AvatarProps) {
  return (
    <span
      className='border flex'
      style={{
        backgroundImage: `url("/api/avatar/${user._id}.png?ts=${user.avatarUpdatedAt}"), url("/avatar_default.png")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderColor: 'var(--bg-color-3)',
        borderRadius: size / 2,
        height: size,
        width: size,
      }}
    />
  );
}
