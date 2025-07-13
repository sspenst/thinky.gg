import { GameId } from '@root/constants/GameId';
import { AppContext } from '@root/contexts/appContext';
import getLevelCompleteColor from '@root/helpers/getLevelCompleteColor';
import getPngDataClient from '@root/helpers/getPngDataClient';
import getProfileSlug from '@root/helpers/getProfileSlug';
import useUrl from '@root/hooks/useUrl';
import { EnrichedLevel } from '@root/models/db/level';
import User from '@root/models/db/user';
import classNames from 'classnames';
import { Types } from 'mongoose';
import Link from 'next/link';
import { useContext, useMemo } from 'react';
import Dimensions from '../../constants/dimensions';
import FormattedDifficulty from '../formatted/formattedDifficulty';
import FormattedUser from '../formatted/formattedUser';
import GameLogo from '../gameLogo';
import LevelDropdown from '../level/info/levelDropdown';
import Solved from '../level/info/solved';
import StyledTooltip from '../page/styledTooltip';
import ProfileAvatar from '../profile/profileAvatar';
import LoadingCard from './loadingCard';

interface LevelCardProps {
  href?: string;
  // this id should not include levelid
  id: string;
  level: EnrichedLevel | undefined | null;
  onClick?: () => void;
}

export default function LevelCard({ href, id, level, onClick }: LevelCardProps) {
  const { game: pageGame, user: reqUser } = useContext(AppContext);
  const getUrl = useUrl();

  const defaultUrl = getUrl(level?.gameId, `/level/${level?.slug}`);

  const backgroundImage = useMemo(() => {
    if (level && level.data) {
      return getPngDataClient(level.gameId || pageGame.id, level.data);
    }

    return undefined;
  }, [pageGame.id, level]);

  if (level === undefined) {
    return <LoadingCard />;
  }

  if (!level) {
    return null;
  }

  /**
   * get User object from level userId property (which can either be a User or an ObjectId)
   * @returns the full User object if possible, otherwise null
   */
  function getUser() {
    if (!level || !level.userId) {
      return null;
    }

    // user is an ObjectId
    if (!Object.prototype.hasOwnProperty.call(level.userId, 'name')) {
      // try to get user from reqUser
      if (reqUser && reqUser._id.toString() === (level.userId as Types.ObjectId)?.toString()) {
        return reqUser;
      } else {
        return null;
      }
    }

    return level.userId as User;
  }

  const user = getUser();

  if (!user) {
    return null;
  }

  const color = getLevelCompleteColor(level);
  const showGameLabel = pageGame.id === GameId.THINKY;

  return (
    <section className='pb-3 rounded-lg flex flex-col gap-2 w-64 max-w-full h-fit hover-bg-2 transition p-1 text-left relative'>

      <Link
        className='border-2 border-color-2 background rounded-md bg-cover bg-center w-full relative overflow-hidden'
        href={href ?? (defaultUrl || `/level/${level.slug}`)}
        onClick={onClick}
        style={{
          aspectRatio: '40 / 21',
          backgroundImage: backgroundImage ? 'url("' + backgroundImage + '")' : 'none',
          borderColor: color,
        }}
      >

        <div
          className='text-xs absolute bottom-0 right-0 px-1 bg-black font-bold'
          style={{
            color: color ?? 'white',
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
      {showGameLabel &&
          <div className='absolute top-1 left-1 p-1' data-tooltip-content={level.gameId || pageGame.id} data-tooltip-id={'game-label-tooltip-' + level._id.toString()}>
            <GameLogo clickable gameId={level.gameId || pageGame.id} id={'level'} size={16} />
            <StyledTooltip id={'game-label-tooltip-' + level._id.toString()} />
          </div>
      }
      <div className='flex justify-between'>
        <div className='flex gap-3 overflow-hidden'>
          {!level.isDraft &&
            <Link className='h-fit' href={getProfileSlug(user)} passHref>
              <ProfileAvatar user={user} />
            </Link>
          }
          <h2 className={classNames('flex flex-col gap-0.5 overflow-hidden break-words', { 'pl-2': level.isDraft })}>
            <Link
              className='font-bold overflow-hidden w-fit max-w-full'
              href={href ?? `/level/${level.slug}`}
              onClick={onClick}
              style={{
                color: color,
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
              }}
            >
              {level.name}
            </Link>
            {!level.isDraft &&
              <FormattedUser
                className='font-medium text-sm gray'
                hideAvatar
                id='author'
                size={Dimensions.AvatarSizeSmall}
                user={user}
              />
            }
            {!level.isDraft &&
              <div className='flex text-xs items-center gap-1 pt-0.5'>
                <FormattedDifficulty id={id} level={level} />
              </div>
            }
          </h2>
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
    </section>
  );
}
