import React from 'react';
import useUser from '../hooks/useUser';

interface UserAvatarProps {
  size: number;
}

export default function UserAvatar({ size }: UserAvatarProps) {
  const { user } = useUser();

  if (!user?.avatar) {
    return null;
  }

  return (
    <div style={{
      // backgroundImage: 'url("' + Buffer.from(user.avatar).toString() + '")',
      backgroundImage: 'url("/api/avatar/' + user._id + '")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      borderRadius: size / 2,
      height: size,
      width: size,
    }} />
  );
}
