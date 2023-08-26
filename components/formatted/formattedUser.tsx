import Link from 'next/link';
import React from 'react';
import getProfileSlug from '../../helpers/getProfileSlug';
import User from '../../models/db/user';
import ProfileAvatar from '../profile/profileAvatar';
import RoleIcons from '../page/roleIcons';

interface FormattedUserProps {
  noLinks?: boolean;
  onClick?: () => void;
  size?: number;
  user?: User | null;
}

export default function FormattedUser({ noLinks, onClick, size, user }: FormattedUserProps) {
  // NB: user could be an empty object here if it came from a projection after using preserveNullAndEmptyArrays
  if (!user || Object.keys(user).length === 0) {
    return (
      <div className='flex items-center font-bold gap-2 truncate'>
        <span className='truncate'>
          [deleted]
        </span>
      </div>
    );
  }

  return (
    <div className='flex items-center gap-2 truncate'>
      {noLinks ?
        <>
          <ProfileAvatar size={size} user={user} />
          <span className='truncate'>{user.name}</span>
        </>
        :
        <>
          <Link href={getProfileSlug(user)} passHref>
            <ProfileAvatar size={size} user={user} />
          </Link>
          <Link
            className='font-bold underline truncate'
            href={getProfileSlug(user)}
            onClick={onClick}
            passHref
          >
            <span>{user.name}</span>
          </Link>
        </>
      }
      <RoleIcons user={user} />
    </div>
  );
}
