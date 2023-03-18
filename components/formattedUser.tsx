import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import Role from '../constants/role';
import getProfileSlug from '../helpers/getProfileSlug';
import User from '../models/db/user';
import Avatar from './avatar';

interface FormattedUserProps {
  noLinks?: boolean;
  onClick?: () => void;
  size?: number;
  user?: User;
}

/** to do, move these functions to a helper file */
export function getIconsForUser(user: User) {
  return (
    <>
      {user.roles?.map((role: Role) => {
        const { icon, description_short } = getRoleData(role);

        return <span key={user._id + '-' + role} className='text-xs qtip tooltip' data-tooltip={description_short}>
          {icon}
        </span>;
      })}
    </>
  );
}

export function getRoleData(role: Role) {
  let icon;
  let description_short = '';

  if (role === Role.ADMIN) {
    icon = '';
    description_short = 'Admin';
  } else if (role === Role.CURATOR) {
    // moderator
    icon = '';
    description_short = 'Curator';
  } else if (role === Role.PRO_SUBSCRIBER) {
    // a star
    icon = <Image alt='logo' src='/pro-logo.svg' width='32' height='32' className='h-6 w-6' />;
    description_short = 'Pro Subscriber';
  }

  return {
    icon: icon,
    description_short: description_short,
  };
}

export default function FormattedUser({ noLinks, onClick, size, user }: FormattedUserProps) {
  if (!user) {
    return (
      <div className={'flex items-center font-bold gap-2'}>
        [deleted]
      </div>
    );
  }

  return (
    <div className={'flex items-center gap-2'}>
      {noLinks ?
        <>
          <Avatar size={size} user={user} />
          <span>{user.name}</span>
        </>
        :
        <>

          <Link href={getProfileSlug(user)} passHref>
            <Avatar size={size} user={user} />
          </Link>

          <Link
            className='font-bold underline'
            href={getProfileSlug(user)}
            onClick={onClick}
            passHref
          >
            <span>{user.name}</span>
          </Link>
          <div className='flex flex-col'>{getIconsForUser(user)}</div>

        </>
      }
    </div>
  );
}
