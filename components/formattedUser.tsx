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
    <div
      style={{
        gridTemplateColumns: 'min-content 1fr',
      }}
      className={classNames(
        'grid grid-cols-2 items-center',
        { 'justify-center': center }
      )

      }>
      <div className='w-fit mr-2'>
        <Link href={`/profile/${user._id}`} passHref>
          <a>
            <Avatar size={Dimensions.AvatarSize} user={user}/>
          </a>
        </Link>
      </div>
      <div className='text-left'>
        <Link href={`/profile/${user._id}`} passHref>
          <a className='font-bold underline'>
            <span>{user.name}</span>
          </a>
        </Link>
      </div>
    </div>
  );
}
