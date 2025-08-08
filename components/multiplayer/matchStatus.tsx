import Dimensions from '@root/constants/dimensions';
import { AppContext } from '@root/contexts/appContext';
import { multiplayerMatchTypeToText } from '@root/helpers/multiplayerHelperFunctions';
import { MatchAction, MatchLogDataGameRecap, MultiplayerMatchState } from '@root/models/constants/multiplayer';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import classNames from 'classnames';
import Link from 'next/link';
import React, { useContext, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import FormattedUser from '../formatted/formattedUser';
import StyledTooltip from '../page/styledTooltip';
import MultiplayerRating from './multiplayerRating';

interface MatchStatusProps {
  isMatchPage?: boolean;
  match: MultiplayerMatch;
  onJoinClick?: (matchId: string) => void;
  onLeaveClick?: (matchId: string) => void;
  recap?: MatchLogDataGameRecap;
}

export default function MatchStatus({ isMatchPage, match, onJoinClick, onLeaveClick, recap }: MatchStatusProps) {
  const [countDown, setCountDown] = React.useState<number>(0);
  const { user } = useContext(AppContext);

  const joinMatch = async () => {
    toast.dismiss();
    toast.loading('Joining Match...');

    fetch(`/api/match/${match.matchId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: MatchAction.JOIN,
      }),
    }).then(res => {
      if (!res.ok) {
        throw res.text();
      }

      toast.dismiss();
      toast.success('Joined Match');

      if (onJoinClick) {
        onJoinClick(match.matchId);
      }
    }).catch(async err => {
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error || 'Failed to join match');
    });
  };

  const leaveMatch = async () => {
    if (match.state === MultiplayerMatchState.ACTIVE && match.timeUntilStart < 0 && !confirm('Leaving this match will result in a loss. Are you sure you want to leave?')) {
      return;
    }

    toast.dismiss();
    toast.loading('Leaving Match...');

    fetch(`/api/match/${match.matchId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: MatchAction.QUIT,
      }),
    }).then(res => {
      if (!res.ok) {
        throw res.text();
      }

      toast.dismiss();
      toast.success('Left Match');

      if (onLeaveClick) {
        onLeaveClick(match.matchId);
      }
    }).catch(async err => {
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error || 'Failed to leave match');
    });
  };

  useEffect(() => {
    const drift = new Date(match.endTime).getTime() - match.timeUntilEnd - Date.now();
    const iv = setInterval(() => {
      const cd = new Date(match.endTime).getTime() - Date.now();
      const ncd = (-drift + cd) / 1000;

      setCountDown(ncd > 0 ? ncd : 0); // TODO. verify this should be -drift not +drift...
    }, 250);

    return () => clearInterval(iv);
  }, [match]);

  const timeUntilEndCleanStr = `${Math.floor(countDown / 60)}:${((countDown % 60) >> 0).toString().padStart(2, '0')}`;

  return (
    <div className='relative'>
      <div className='absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-sm opacity-50' />
      <div
        className='relative flex flex-col sm:flex-row justify-between gap-4 py-4 px-4 sm:px-6 bg-white/8 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 w-full'
      >
        {/* Left Section - Actions */}
        <div className='flex flex-row sm:flex-col gap-2 items-center sm:items-start'>
          {match.players.some(player => user?._id.toString() !== player._id.toString()) && (match.state === MultiplayerMatchState.OPEN) &&
            <div className='flex gap-2'>
              <button
                className='bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200'
                onClick={joinMatch}
              >
                Join
              </button>
              {!isMatchPage && (
                <Link
                  className='bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200 text-center'
                  href={`/match/${match.matchId}`}
                >
                  View
                </Link>
              )}
            </div>
          }
          {match.players.some(player => user?._id.toString() === player._id.toString()) && (match.state === MultiplayerMatchState.OPEN || match.state === MultiplayerMatchState.ACTIVE) &&
            <>
              {!isMatchPage && (
                <Link
                  className='bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200 text-center'
                  href={`/match/${match.matchId}`}
                >
                  View
                </Link>
              )}
              <button
                className='bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200'
                onClick={leaveMatch}
              >
                Leave
              </button>
            </>
          }
          {!isMatchPage && !match.players.some(player => user?._id.toString() === player._id.toString()) && (match.state === MultiplayerMatchState.ACTIVE) &&
            <Link
              className='bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200 text-center'
              href={`/match/${match.matchId}`}
            >
              View
            </Link>
          }
          {/* Match Type Badge */}
          <div className='flex flex-col gap-1 items-center sm:items-start'>
            <div className='bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-lg px-3 py-1 border border-white/20'>
              <span className='font-bold whitespace-nowrap text-white'>
                {multiplayerMatchTypeToText(match.type)}
              </span>
            </div>
            <div className='flex gap-2'>
              <span className='text-xs px-2 py-0.5 bg-white/10 rounded-full text-white/80'>
                {match.private ? 'Private' : 'Public'}
              </span>
              {!match.rated ? (<>
                <span className='text-xs px-2 py-0.5 bg-yellow-500/20 rounded-full text-yellow-300' data-tooltip-id='unrated-match' data-tooltip-content='This match will not affect elo ratings'>Unrated</span>
                <StyledTooltip id='unrated-match' />
              </>) : <span className='text-xs px-2 py-0.5 bg-green-500/20 rounded-full text-green-300'>Rated</span>}
            </div>
            {match.state === MultiplayerMatchState.ACTIVE && match.timeUntilEnd > 0 && (
              <span className={classNames('font-bold text-xl', {
                'text-red-400 animate-pulse': countDown <= 30,
                'hidden': countDown === 0,
              })}>
                {timeUntilEndCleanStr}
              </span>
            )}
          </div>
        </div>
        {/* Center/Right Section - Players */}
        <div className='flex flex-col gap-2 flex-1'>
          {match.players.map((player) => (
            <div
              className='flex items-center gap-3 bg-white/5 rounded-lg p-2 border border-white/10'
              key={player._id.toString()}
            >
              {player._id.toString() in match.scoreTable &&
                <div className='bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg px-3 py-1 min-w-[3rem] text-center'>
                  <span className='font-bold text-2xl text-yellow-300'>
                    {match.scoreTable[player._id.toString()]}
                  </span>
                </div>
              }
              <span className='text-lg'>🎮</span>
              <div className='flex-1'>
                <FormattedUser size={Dimensions.AvatarSizeSmall} id='match-status' user={player} />
              </div>
              <div className='flex items-center gap-2'>
                <MultiplayerRating hideType profile={player.multiplayerProfile} type={match.type} />
                {recap?.winner?.userId.toString() === player._id.toString() &&
                  <span className='text-xs text-green-400'>
                    {`(${Math.round(recap.eloChangeWinner) >= 0 ? '+' : ''}${Math.round(recap.eloChangeWinner)})`}
                  </span>
                }
                {recap?.loser?.userId.toString() === player._id.toString() &&
                  <span className='text-xs text-red-400'>
                    {`(${Math.round(recap.eloChangeLoser) >= 0 ? '+' : ''}${Math.round(recap.eloChangeLoser)})`}
                  </span>
                }
              </div>
            </div>
          ))}
        </div>
        {/* Copy Link Button for Open Matches */}
        {match.state === MultiplayerMatchState.OPEN && (
          <div className='absolute top-2 right-2 sm:static'>
            <button
              className='p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200'
              data-tooltip-content='Copy match link to clipboard'
              data-tooltip-id='copy-match-link'
              onClick={(e) => {
                navigator.clipboard.writeText(`${window.location.origin}/match/${match.matchId}`);
                toast.success('Copied to clipboard');
                e.preventDefault();
              }}
            >
              <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='text-white/80' viewBox='0 0 16 16'>
                <path d='M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z' />
                <path d='M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z' />
              </svg>
            </button>
            <StyledTooltip id='copy-match-link' />
          </div>
        )}
      </div>
    </div>
  );
}
