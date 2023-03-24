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
export const PRO_SVG_ICON = <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='lightblue'
  className='bi bi-gem' viewBox='0 0 16 16'>
  <path d='M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974c.149.185.156.45.01.644L8.4 15.3a.5.5 0 0 1-.8 0L.1 5.3a.5.5 0 0 1 0-.6l3-4zm11.386 3.785-1.806-2.41-.776 2.413 2.582-.003zm-3.633.004.961-2.989H4.186l.963 2.995 5.704-.006zM5.47 5.495 8 13.366l2.532-7.876-5.062.005zm-1.371-.999-.78-2.422-1.818 2.425 2.598-.003zM1.499 5.5l5.113 6.817-2.192-6.82L1.5 5.5zm7.889 6.817 5.123-6.83-2.928.002-2.195 6.828z' />
</svg>;

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
    icon = PRO_SVG_ICON;
    //icon = <Image alt='logo' src='/pro-logo.svg' width='16' height='16' />;
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
