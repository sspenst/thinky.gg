import classNames from 'classnames';
import React, { useContext, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { PageContext } from '../contexts/pageContext';
import MultiplayerMatch from '../models/db/multiplayerMatch';
import { MatchAction, MultiplayerMatchState } from '../models/MultiplayerEnums';
import FormattedUser from './formattedUser';

interface MatchStatusProps {
  match: MultiplayerMatch;
  onJoinClick?: (matchId: string) => void;
  onLeaveClick?: (matchId: string) => void;
}

export default function MatchStatus({ match, onJoinClick, onLeaveClick }: MatchStatusProps) {
  const [countDown, setCountDown] = React.useState<number>(0);
  const { user } = useContext(PageContext);

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
      className='flex flex-row flex-wrap justify-center gap-4 py-3 px-4 border rounded-md shadow-lg items-center'
      style={{
        backgroundColor: 'var(--bg-color-2)',
        borderColor: 'var(--bg-color-3)',
      }}
    >
      {match.players.some(player => user?._id.toString() !== player._id.toString() && match.state === MultiplayerMatchState.OPEN) &&
        <button
          className='w-20 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
          onClick={joinMatch}
        >
          Join
        </button>
      }
      {match.players.some(player => user?._id.toString() === player._id.toString()) && (match.state === MultiplayerMatchState.OPEN || match.state === MultiplayerMatchState.ACTIVE) &&
        <button
          className='w-20 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded'
          onClick={leaveMatch}
        >
          Leave
        </button>
      }
      <span className={classNames('font-bold text-xl self-center', {
        'text-red-500 animate-pulse': countDown <= 30,
        'hidden': countDown === 0,
      })}>
        {timeUntilEndCleanStr}
      </span>
      {match.players.map((player) => (
        <div
          className={'flex gap-4 items-center'}
          key={player._id.toString()}
        >
          <FormattedUser rating={player.multiplayerProfile?.rating} user={player} />
          {player._id.toString() in match.scoreTable && <span className='font-bold text-2xl'>{match.scoreTable[player._id.toString()]}</span>}
        </div>
      ))}
    </div>
  );
}
