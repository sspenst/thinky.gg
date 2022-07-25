import React from 'react';
import { Types } from 'mongoose';

interface AvatarProps {
  id: Types.ObjectId;
  size: number;
}

export default function Avatar({ id, size }: AvatarProps) {
  return (
    <div
      style={{
        backgroundImage: `url("/api/avatar/${id}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: size / 2,
        height: size,
        width: size,
      }}
    />
  );
}
