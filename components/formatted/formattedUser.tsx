import { ProfileQueryType } from '@root/constants/profileQueryType';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import getProfileSlug from '../../helpers/getProfileSlug';
import User from '../../models/db/user';
import LoadingSpinner from '../page/loadingSpinner';
import RoleIcons from '../page/roleIcons';
import StyledTooltip from '../page/styledTooltip';
import PlayerRank from '../profile/playerRank';
import ProfileAvatar from '../profile/profileAvatar';
import FormattedDate from './formattedDate';

interface FormattedUserProps {
  noLinks?: boolean;
  onClick?: () => void;
  size?: number;
  user?: User | null;
}

const cache = {} as { [key: string]: any};

export default function FormattedUser({ noLinks, onClick, size, user }: FormattedUserProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [userExtendedData, setUserExtendedData] = useState<any>();

  useEffect(() => {
    if (!showTooltip || !user || userExtendedData) {
      return;
    }

    if (cache[user._id.toString()]) {
      setUserExtendedData(cache[user._id.toString()]);

      return;
    }

    fetch(`/api/user/${user._id}?type=${Object.values(ProfileQueryType).join(',')}`).then(async res => {
      const data = await res.json();

      setUserExtendedData(data);
      cache[user._id.toString()] = data;
    });
  }, [showTooltip, user, userExtendedData]);

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

  return (<>
    <div
      className='flex items-center gap-2 truncate'
      data-tooltip-html={renderToStaticMarkup(
        <div className='flex flex-col gap-1 p-1 items-start text-sm'>
          {!userExtendedData ? <LoadingSpinner /> : <>
            <div className='flex gap-2 text-base'>
              <span className='font-bold'>{userExtendedData.user.name}</span>
              <PlayerRank
                levelsCompletedByDifficulty={userExtendedData.levelsCompletedByDifficulty}
                user={user}
              />
            </div>
            <div className='flex gap-1'>
              <span className='font-medium'>Levels Completed:</span>
              <span className='gray'>{userExtendedData.user.score}</span>
            </div>
            <div className='flex gap-1'>
              <span className='font-medium'>Registered:</span>
              <FormattedDate ts={userExtendedData.user.ts} />
            </div>
          </>}
        </div>
      )}
      data-tooltip-id={`formatted-user-${user._id.toString()}`}
      onMouseOut={() => setShowTooltip(false)}
      onMouseOver={() => setShowTooltip(true)}
    >
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
            {user.name}
          </Link>
        </>
      }
      <RoleIcons user={user} />
    </div>
    <StyledTooltip id={`formatted-user-${user._id.toString()}`} />
  </>);
}
