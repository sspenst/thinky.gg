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
    <div
      className='flex flex-row justify-center gap-4 py-3 px-4 border rounded-md shadow-lg items-center w-fit max-w-full'
      style={{
        backgroundColor: 'var(--bg-color-2)',
        borderColor: 'var(--bg-color-3)',
      }}
    >
      {match.players.some(player => user?._id.toString() !== player._id.toString()) && (match.state === MultiplayerMatchState.OPEN) &&
        <button
          className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
          onClick={joinMatch}
        >
          Join
        </button>
      }
      {match.players.some(player => user?._id.toString() === player._id.toString()) && (match.state === MultiplayerMatchState.OPEN || match.state === MultiplayerMatchState.ACTIVE) &&
        <button
          className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded'
          onClick={leaveMatch}
        >
          Leave
        </button>
      }
      {!isMatchPage && !match.players.some(player => user?._id.toString() === player._id.toString()) && (match.state === MultiplayerMatchState.ACTIVE) &&
        <Link
          className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-center'
          href={`/match/${match.matchId}`}
        >
          View
        </Link>
      }
      <div className='flex flex-col gap-1 items-center'>
        <span className='font-bold whitespace-nowrap'>
          {multiplayerMatchTypeToText(match.type)}
        </span>
        <div className='flex gap-1'>
          <span className='italic text-xs'>
            {match.private ? 'Private' : 'Public'}
          </span>
          {!match.rated ? (<>
            <span className='italic text-xs' data-tooltip-id='unrated-match' data-tooltip-content='This match will not affect elo ratings'>Unrated</span>
            <StyledTooltip id='unrated-match' />
          </>) : <span className='italic text-xs'>Rated</span>}
        </div>
        {match.state === MultiplayerMatchState.ACTIVE && match.timeUntilEnd > 0 && (
          <span className={classNames('font-bold text-xl flex justify-center w-12', {
            'text-red-500 animate-pulse': countDown <= 30,
            'hidden': countDown === 0,
          })}>
            {timeUntilEndCleanStr}
          </span>
        )}
      </div>
      <div className='flex flex-col gap-1 truncate pr-0.5'>
        {match.players.map((player) => (
          <div
            className='flex gap-2 items-center'
            key={player._id.toString()}
          >
            {player._id.toString() in match.scoreTable &&
              <span className='font-bold text-2xl w-10 text-center' style={{ minWidth: 40 }}>
                {match.scoreTable[player._id.toString()]}
              </span>
            }
            <FormattedUser id='match-status' user={player} />
            <MultiplayerRating hideType profile={player.multiplayerProfile} type={match.type} />
            {recap?.winner?.userId.toString() === player._id.toString() &&
              <span className='text-xs italic' style={{
                color: 'var(--color-gray)',
              }}>
                {`(${Math.round(recap.eloChangeWinner) >= 0 ? '+' : ''}${Math.round(recap.eloChangeWinner)})`}
              </span>
            }
            {recap?.loser?.userId.toString() === player._id.toString() &&
              <span className='text-xs italic' style={{
                color: 'var(--color-gray)',
              }}>
                {`(${Math.round(recap.eloChangeLoser) >= 0 ? '+' : ''}${Math.round(recap.eloChangeLoser)})`}
              </span>
            }
          </div>
        ))}
      </div>
      {match.state === MultiplayerMatchState.OPEN && <>
        <Link
          className='underline italic text-xs'
          data-tooltip-content='Copy match link to clipboard'
          data-tooltip-id='copy-match-link'
          href={`/match/${match.matchId}`}
          id='copytoclipboard'
          onClick={(e) => {
            // copy to clipboard
            navigator.clipboard.writeText(`${window.location.origin}/match/${match.matchId}`);
            toast.success('Copied to clipboard');
            e.preventDefault();

            return false;
          }}
        >
          <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-clipboard' viewBox='0 0 16 16'>
            <path d='M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z' />
            <path d='M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z' />
          </svg>
        </Link>
        <StyledTooltip id='copy-match-link' />
      </>}
    </div>
  );
}
