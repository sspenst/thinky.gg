import Avatar from './avatar';
import Dimensions from '../constants/dimensions';
import Link from 'next/link';
import React from 'react';
import User from '../models/db/user';
import classNames from 'classnames';

interface FormattedUserProps {
  center?: boolean;
  user: User;
}

export default function FormattedUser({ center = true, user }: FormattedUserProps) {
  return (
    <div className={classNames(
      'flex items-center gap-2',
      { 'justify-center': center }
    )}>
      <Link href={`/profile/${user._id}`} passHref>
        <a>
          <Avatar size={Dimensions.AvatarSize} user={user}/>
        </a>
      </Link>
      <Link href={`/profile/${user._id}`} passHref>
        <a className='font-bold underline'>
          <span>{user.name}</span>
        </a>
      </Link>
    </div>
  );
}
