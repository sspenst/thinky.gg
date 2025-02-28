import Dimensions from '@root/constants/dimensions';
import { GameId } from '@root/constants/GameId';
import { ProfileQueryType, UserExtendedData } from '@root/constants/profileQueryType';
import { AppContext } from '@root/contexts/appContext';
import isOnline from '@root/helpers/isOnline';
import classNames from 'classnames';
import Link from 'next/link';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import getProfileSlug from '../../helpers/getProfileSlug';
import User from '../../models/db/user';
import GameLogoAndLabel from '../gameLogoAndLabel';
import LoadingSpinner from '../page/loadingSpinner';
import RoleIcons from '../page/roleIcons';
import StyledTooltip from '../page/styledTooltip';
import PlayerRank from '../profile/playerRank';
import ProfileAvatar from '../profile/profileAvatar';
import FormattedDate from './formattedDate';

interface FormattedUserProps {
  className?: string;
  hideAvatar?: boolean;
  // NB: this id should not contain the user id
  id: string;
  noLinks?: boolean;
  noTooltip?: boolean;
  onClick?: () => void;
  size?: number;
  user?: User | null;
}

const cache = {} as { [key: string]: UserExtendedData };

export default function FormattedUser({ className, hideAvatar, id, noLinks, noTooltip, onClick, size = Dimensions.AvatarSize, user }: FormattedUserProps) {
  const { game } = useContext(AppContext);
  const [showTooltip, setShowTooltip] = useState(false);
  const [userExtendedData, setUserExtendedData] = useState<UserExtendedData>();
  const setTimer = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    if (!showTooltip || !user || userExtendedData) {
      return;
    }

    if (cache[user._id.toString()]) {
      setUserExtendedData(cache[user._id.toString()]);

      return;
    }

    fetch(`/api/user/${user._id}?type=${Object.values(ProfileQueryType).join(',')}`).then(async res => {
      if (!user) {
        console.warn('User was null when fetching user data');
      }

      const data = await res.json() as UserExtendedData;

      setUserExtendedData(data);
      cache[user?._id.toString()] = data;
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

  const tooltipId = `formatted-user-${user._id.toString()}-${id}`;

  return (<>
    <div
      className={classNames('flex items-center gap-2 truncate w-fit max-w-full font-bold', className)}
      onMouseOut={() => {
        if (setTimer.current) {
          clearTimeout(setTimer.current);
        }

        setShowTooltip(false);
      }}
      onMouseOver={() => {
        if (setTimer.current) {
          clearTimeout(setTimer.current);
        }

        setTimer.current = setTimeout(() => {
          setShowTooltip(true);
        }, 200);
      }}
    >
      <div
        className='flex items-center gap-2 truncate w-fit'
        data-tooltip-html={renderToStaticMarkup(
          !userExtendedData ? <LoadingSpinner /> :
            <div className='flex flex-col gap-0.5 p-1 items-start text-sm truncate'>
              {!game.isNotAGame &&
                <PlayerRank
                  levelsSolvedByDifficulty={userExtendedData?.levelsSolvedByDifficulty}
                  user={user}
                />
              }
              {!game.isNotAGame && !game.disableRanked &&
              <div className='flex gap-1'>
                <span className='font-medium'>Ranked Solves:</span>
                <span className='gray'>{userExtendedData.user.config?.calcRankedSolves ?? 0} 🏅</span>
              </div>
              }
              { userExtendedData.user.config?.calcCurrentStreak && userExtendedData.user.config?.calcCurrentStreak > 0 &&
              <div className='flex gap-1'>
                <span className='font-medium'>{game.displayName} Streak</span>
                <span className='gray'>{userExtendedData.user.config?.calcCurrentStreak ?? 0} days</span>
              </div>
              }
              {!game.isNotAGame &&
              <div className='flex gap-1'>
                <span className='font-medium'>Levels Solved:</span>
                <span className='gray'>{userExtendedData.user.config?.calcLevelsSolvedCount ?? 0}</span>
              </div>
              }
              {!game.isNotAGame &&
              <div className='flex gap-1'>
                <span className='font-medium'>Levels Completed:</span>
                <span className='gray'>{userExtendedData.user.config?.calcLevelsCompletedCount ?? 0}</span>
              </div>
              }
              {user.hideStatus || !userExtendedData.user.ts ? null : isOnline(userExtendedData.user) ?
                <div className='flex gap-1 items-center'>
                  <span className='font-medium'>Currently Playing:</span>
                  <div className='flex gap-1' style={{
                    color: 'var(--color-gray)',
                  }}>
                    <GameLogoAndLabel gameId={userExtendedData.user.lastGame ?? GameId.THINKY} id={id} size={16} />
                  </div>
                </div>
                :
                <div className='flex gap-1'>
                  <span className='font-medium'>Last Seen:</span> <FormattedDate ts={user.last_visited_at ? user.last_visited_at : user.ts} />
                </div>
              }
              <div className='flex gap-1'>
                <span className='font-medium'>Registered:</span>
                {userExtendedData.user?.ts ? <FormattedDate ts={userExtendedData.user.ts} /> : <span className='gray'>Not registered</span>}
              </div>
            </div>
        )}
        data-tooltip-id={tooltipId}
      >
        {noLinks ?
          <>
            {!hideAvatar && <ProfileAvatar size={size} user={user} />}
            <span className='truncate'>{user.name}</span>
          </>
          :
          <>
            {!hideAvatar &&
              <Link href={getProfileSlug(user)} passHref>
                <ProfileAvatar size={size} user={user} />
              </Link>
            }
            <Link
              className='hover:underline truncate'
              href={getProfileSlug(user)}
              onClick={onClick}
              passHref
            >
              {user.name}
            </Link>
          </>
        }
      </div>
      {!noTooltip && <StyledTooltip id={tooltipId} />}
      <RoleIcons id={id} size={size / 2} user={user} />
    </div>
  </>);
}
