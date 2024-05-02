import User from '@root/models/db/user';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import Role from '../../constants/role';
import StyledTooltip from './styledTooltip';

interface RoleIconProps {
  id: string;
  role: Role;
  size?: number;
}

export function RoleIcon({ id, role, size = 18 }: RoleIconProps) {
  let icon = null;
  let tooltip = '';
  const tooltipId = `role-icon-tooltip-${id}-${role}`;

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
    icon = <Image alt='pro' src='/pro.svg' width={size} height={size} style={{ minWidth: size, minHeight: size }} />;
    tooltip = 'Pro Subscriber';
    break;
  }

  if (!icon) {
    return null;
  } else {
    return (
      <Link href='/pro'>
        <span data-tooltip-id={tooltipId} data-tooltip-content={tooltip}>
          {icon}
        </span>
        <StyledTooltip id={tooltipId} />
      </Link>
    );
  }
}

interface RoleIconsProps {
  id: string;
  size?: number;
  user: User;
}

export default function RoleIcons({ id, size, user }: RoleIconsProps) {
  const roles = user.roles || [];
  const configRoles = user.config?.roles || [];
  const dedupeRoles = Array.from(new Set([...roles, ...configRoles]));

  return (<>
    {dedupeRoles?.map(role => <RoleIcon id={id} key={`role-icon-${user._id.toString()}-${role.toString()}`} role={role} size={size} />)}
  </>);
}
