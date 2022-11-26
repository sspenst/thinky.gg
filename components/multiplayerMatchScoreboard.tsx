import React, { useContext, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { PageContext } from '../contexts/pageContext';
import MultiplayerMatch from '../models/db/multiplayerMatch';
import { MatchAction } from '../models/MultiplayerEnums';
import FormattedUser from './formattedUser';

export default function MultiplayerMatchScoreboard({ match, onLeaveClick }: {match: MultiplayerMatch, onLeaveClick?: (matchId: string) => void}) {
  const { user } = useContext(PageContext);
  const [countDown, setCountDown] = React.useState<number>(0);

  const btnLeaveMatch = async (matchId: string) => {
    toast.dismiss();
    toast.loading('Leaving Match...');
    const res = await fetch(`/api/match/${matchId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: MatchAction.QUIT,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      toast.dismiss();
      toast.error(data.error || 'Failed to leave match');
    } else {
      toast.dismiss();
      toast.success('Left Match');
    }

    if (onLeaveClick) {
      onLeaveClick(matchId);
    }
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

  // MM:SS with seconds padded to 2 digits
  const timeUntilEndCleanStr = `${Math.floor(countDown / 60)}:${((countDown % 60) >> 0).toString().padStart(2, '0')}`;
  let timeClass = 'text-white font-bold text-xl self-center p-3';

  if (countDown <= 30) {
    timeClass = 'text-red-500 font-bold text-xl self-center p-3 animate-pulse';

    if (countDown === 0) {
      // just hide it
      timeClass = 'hidden';
    }
  }

  return (
    <div key={match._id.toString()} className='p-3 flex flex-row'>
      <span className={timeClass}>{timeUntilEndCleanStr}</span>
      {match.players.map((player) => (
        <div key={player._id.toString()} className={'px-3 flex gap-1 ' + ((match.winners.includes(player._id.toString() as any)) ? 'rounded-full ring-4 ring-offset-2 ' : '')}>
          <FormattedUser user={player} noLinks />

          <span className='self-center p-3'>{match.scoreTable[player._id.toString()]}
          </span>
          {onLeaveClick && user?._id.toString() === player._id.toString() && (
            <button
              onClick={() => btnLeaveMatch(match.matchId)}
              className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'>
        Quit
            </button>

          )}
        </div>
      ))}

    </div>
  );
}
