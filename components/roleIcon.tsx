import Image from 'next/image';
import React from 'react';
import Role from '../constants/role';

interface RoleIconProps {
  role: Role;
}

export default function RoleIcon({ role }: RoleIconProps) {
  let icon = null;
  let tooltip = '';

  switch (role) {
  case (Role.ADMIN):
    // TODO: admin icon
    tooltip = 'Admin';
    break;
  case (Role.CURATOR):
    // TODO: curator icon
    tooltip = 'Curator';
    break;
  case (Role.PRO):
    icon = <Image alt='pro' src='/pro.svg' width='16' height='16' />;
    tooltip = 'Pro Subscriber';
    break;
  }

  if (!icon) {
    return null;
  } else {
    return (
      <span className='qtip' data-tooltip={tooltip}>
        {icon}
      </span>
    );
  }
}
