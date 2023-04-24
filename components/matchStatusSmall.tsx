import classNames from 'classnames';
import Link from 'next/link';
import React, { useContext, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { AppContext } from '../contexts/appContext';
import { MatchAction, MultiplayerMatchState, MultiplayerMatchType } from '../models/MultiplayerEnums';
import FormattedDate from './formattedDate';
import FormattedUser from './formattedUser';
import { getMatchTypeNameFromMatchType, getProfileRatingDisplay, MatchStatusProps } from './matchStatus';
import StyledTooltip from './styledTooltip';

export default function MatchStatusSmall({ isMatchPage, match, onLeaveClick, recap }: MatchStatusProps) {
  return (
    <div
      className='flex flex-col flex-wrap justify-center gap-4 pt-3 border rounded-md shadow-lg items-center'
      style={{
        backgroundColor: 'var(--bg-color-2)',
        borderColor: 'var(--bg-color-3)',
      }}
    >

      <div>
        {match.players.map((player) => (
          <div
            className={'flex gap-2 items-center'}
            key={player._id.toString()}
          >
            <FormattedUser user={player} />
            {getProfileRatingDisplay(match.type, player.multiplayerProfile)}

            {match.scoreTable && player._id.toString() in match.scoreTable && <span className='font-bold text-2xl ml-2'>{match.scoreTable[player._id.toString()]}</span>}

          </div>
        ))}

      </div>

      <span className='flex flex-col' style={{
        color: 'var(--color-gray)',
      }}>
        <div className='flex flex-row gap-3 items-center'>
          <span className='text-xs italic'>
            {getMatchTypeNameFromMatchType(match.type)} (
            {
              ({
                [MultiplayerMatchType.RushBullet]: '3m',
                [MultiplayerMatchType.RushBlitz]: '5m',
                [MultiplayerMatchType.RushRapid]: '10m',
                [MultiplayerMatchType.RushClassical]: '30m'
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any)[match.type]
            }
            )

          </span>
          <div className='flex flex-col gap-1 items-center'>
            <div className='flex flex-row gap-1 items-center'>
              {match.private ? (
                <span className='italic text-xs'>Private</span>
              ) : <span className='italic text-xs'>Public</span>}
              {!match.rated ? (<>
                <span className='italic text-xs' data-tooltip-id='unrated-match' data-tooltip-content='This match will not affect elo ratings'>Unrated</span>
                <StyledTooltip id='unrated-match' />
              </>) : <span className='italic text-xs'>Rated</span>}
            </div>
            <FormattedDate date={match.endTime} />

          </div>
        </div>

      </span>
      <Link
        className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-center w-full'
        href={`/match/${match.matchId}`}
      >
          View
      </Link>

    </div>
  );
}
