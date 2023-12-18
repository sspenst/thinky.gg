import getProfileSlug from '@root/helpers/getProfileSlug';
import { EnrichedLevel } from '@root/models/db/level';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import Dimensions from '../../../constants/dimensions';
import getPngDataClient from '../../../helpers/getPngDataClient';
import FormattedDifficulty from '../../formatted/formattedDifficulty';
import FormattedUser from '../../formatted/formattedUser';
import StyledTooltip from '../../page/styledTooltip';
import ProfileAvatar from '../../profile/profileAvatar';
import LevelDropdown from './levelDropdown';
import Solved from './solved';

interface LevelCardProps {
  href?: string;
  // this id should not include levelid
  id: string;
  level: EnrichedLevel | undefined | null;
  onClick?: () => void;
}

export default function LevelCard({ href, id, level, onClick }: LevelCardProps) {
  const [backgroundImage, setBackgroundImage] = useState<string>();

  useEffect(() => {
    if (level && level.data) {
      setBackgroundImage(getPngDataClient(level.data));
    }
  }, [level]);

  // TODO: skeleton when level is undefined
  if (!level?.userId) {
    return null;
  }

  function getColor() {
    if (level?.userMoves === undefined) {
      return undefined;
    }

    if (level.userMoves === level.leastMoves) {
      return 'var(--color-complete)';
    }

    return 'var(--color-incomplete)';
  }

  const user = level.userId;

  return (
    <div className='pb-3 rounded-lg select-card flex flex-col gap-2 w-64 max-w-full h-fit hover-bg-2 transition p-1'>
      <Link
        className='border-2 border-color-2 background rounded-md bg-cover bg-center w-full relative overflow-hidden'
        href={href ?? `/level/${level.slug}`}
        onClick={onClick}
        style={{
          aspectRatio: '40 / 21',
          backgroundImage: backgroundImage ? 'url("' + backgroundImage + '")' : 'none',
          borderColor: getColor(),
        }}
      >
        <div
          className='text-xs absolute bottom-0 right-0 px-1 bg-black font-bold'
          style={{
            color: getColor() ?? 'white',
          }}
        >
          {`${level.userMoves === undefined ? '' : level.userMoves}/${level.leastMoves}`}
        </div>
        {level.userMoves === level.leastMoves &&
          <div className='absolute top-0 right-0 rounded-bl-md' style={{
            // using theme-modern bg-1 because all images are generated using the modern theme
            backgroundColor: 'rgb(38, 38, 38)',
          }}>
            <Solved />
          </div>
        }
      </Link>
      <div className='flex justify-between'>
        <div className='flex gap-3'>
          <Link className='h-fit' href={getProfileSlug(user)} passHref>
            <ProfileAvatar user={user} />
          </Link>
          <div className='flex flex-col gap-0.5 overflow-hidden'>
            <Link
              className='font-bold overflow-hidden'
              href={href ?? `/level/${level.slug}`}
              onClick={onClick}
              style={{
                color: getColor(),
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
              }}
            >
              {level.name}
            </Link>
            <FormattedUser className='font-medium text-sm gray' hideAvatar id='author' size={Dimensions.AvatarSizeSmall} user={user} />
            <div className='flex text-xs items-center gap-1 pt-0.5'>
              <FormattedDifficulty
                difficultyEstimate={level.calc_difficulty_estimate}
                id={`${id}-${level._id}`}
                uniqueUsers={level.calc_playattempts_unique_users_count !== undefined ?
                  level.calc_playattempts_unique_users_count :
                  level.calc_playattempts_unique_users.length}
              />
            </div>
          </div>
        </div>
        {/* prevent clicking parent level link */}
        <div className='flex flex-col items-center gap-2'>
          <div onClick={e => e.stopPropagation()}>
            <LevelDropdown level={level} />
          </div>
          {level.isRanked && <>
            <Link
              className='font-normal text-lg'
              data-tooltip-content='Ranked level'
              data-tooltip-id='ranked-tooltip'
              href='/ranked'
            >
              🏅
            </Link>
            <StyledTooltip id='ranked-tooltip' />
          </>}
        </div>
      </div>
    </div>
  );
}
