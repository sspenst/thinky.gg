import Link from 'next/link';
import React from 'react';
import Dimensions from '../constants/dimensions';
import getProfileSlug from '../helpers/getProfileSlug';
import User from '../models/db/user';
import Avatar from './avatar';

interface FormattedUserProps {
  onClick?: () => void;
  size?: number;
  user: User;
}

export default function FormattedUser({ onClick, size, user }: FormattedUserProps) {
  return (
    <div className={'flex items-center gap-2'}>
      {user.name && (<Link href={getProfileSlug(user)} passHref>
        <a>
          <Avatar size={size ?? Dimensions.AvatarSize} user={user} />
        </a>
      </Link> )}
      {user.name ? (
        <Link href={getProfileSlug(user)} passHref>
          <a className='font-bold underline' onClick={onClick}>
            <span>{user.name}</span>
          </a>
        </Link>
      ) : (
        'Someone'
      )}
    </div>
  );
}
