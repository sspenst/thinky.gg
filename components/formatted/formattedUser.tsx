import { ProfileQueryType } from '@root/constants/profileQueryType';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import getProfileSlug from '../../helpers/getProfileSlug';
import User from '../../models/db/user';
import LoadingSpinner from '../page/loadingSpinner';
import RoleIcons from '../page/roleIcons';
import LevelsCompletedByDifficultyList from '../profile/levelsCompletedByDifficultyList';
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
  const [showPopover, setShowPopover] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const [userExtendedData, setUserExtendedData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const setTimer = useRef<any>(null);

  useEffect(() => {
    if (showPopover && user) {
      if (cache[user._id.toString()]) {
        setUserExtendedData(cache[user._id.toString()]);

        return;
      }

      setIsLoading(true);
      fetch(`/api/user/${user._id}?type=` + Object.values(ProfileQueryType).join(',') )
        .then(response => response.json())
        .then(data => {
          setUserExtendedData(data);
          setIsLoading(false);
          cache[user._id.toString()] = data;
        });
    }
  }, [showPopover, user]);

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
    <div className='flex items-center gap-2 truncate'

      onMouseOut={() => {
        if (setTimer.current) {
          clearTimeout(setTimer.current);
        }

        setShowPopover(false);
      }}
    >
      {showPopover && (
        <div
          className='popover absolute bg-white p-2 z-10 border rounded-lg transition-all duration-300 fadeIn'

          style={{
            left: `${position.x}px`, top: `${position.y}px`,
            backgroundColor: 'var(--bg-color)',
            cursor: 'pointer',

          }}
        >
          {isLoading ? (
            <div className='flex flex-row gap-2 justify-center items-center'><span>Loading...</span> <LoadingSpinner /></div>
          ) : (
            <div className='flex flex-col gap-2'>
              <div className='flex flex-row gap-2'>
                <span>{userExtendedData.user?.name}</span>
                {userExtendedData.levelsCompletedByDifficulty && <PlayerRank user={user} levelsCompletedByDifficulty={userExtendedData.levelsCompletedByDifficulty} />}
              </div>
              {userExtendedData.user?.ts && (<span className='text-sm'>Member since <FormattedDate ts={userExtendedData.user.ts} /> </span>)}
            </div>
          )}
        </div>
      )}
      {noLinks ?
        <>
          <ProfileAvatar size={size} user={user} />
          <span className='truncate'>{user.name}</span>
        </>
        :
        <>
          <Link

            href={getProfileSlug(user)} passHref>
            <ProfileAvatar size={size} user={user} />
          </Link>
          <Link

            className='font-bold underline truncate'
            href={getProfileSlug(user)}
            onClick={onClick}
            passHref
          >
            <span
              onMouseOver={(event: React.MouseEvent<HTMLDivElement>) => {
                if (setTimer.current) {
                  clearTimeout(setTimer.current);
                }

                const rect = (event.target as HTMLDivElement).getBoundingClientRect();

                // adjust for scroll position

                setPosition({ x: rect.left, y: rect.top + window.scrollY - 70 });

                setTimer.current = setTimeout(() => setShowPopover(true), 1000);
              }}
            >{user.name}</span>

          </Link>
        </>
      }
      <RoleIcons user={user} />
    </div>
  );
}
