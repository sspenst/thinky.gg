import React from 'react';
import { Types } from 'mongoose';

interface AvatarProps {
  id: Types.ObjectId;
  size: number;
}

export default function Avatar({ id, size }: AvatarProps) {
  return (
    <div
      className='border'
      style={{
        backgroundImage: `url("/api/avatar/${id}"), url("/avatar_default.png")`,
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
