import React, { useContext } from 'react';
import { toast } from 'react-hot-toast';
import { PageContext } from '../contexts/pageContext';
import MultiplayerMatch from '../models/db/multiplayerMatch';
import FormattedUser from './formattedUser';

export default function MultiplayerMatchScoreboard({ match, onLeaveClick }: {match: MultiplayerMatch, onLeaveClick: (matchId: string) => void}) {
  const { user } = useContext(PageContext);

  const btnLeaveMatch = async (matchId: string) => {
    toast.dismiss();
    toast.loading('Leaving Match...');
    const res = await fetch(`/api/match/${matchId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'quit',
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

    onLeaveClick(matchId);
  };
  const timeUntilEndClean = match.timeUntilEnd > 0 ? match.timeUntilEnd / 1000 : 0;
  // MM:SS with seconds padded to 2 digits
  const timeUntilEndCleanStr = `${Math.floor(timeUntilEndClean / 60)}:${((timeUntilEndClean % 60) >> 0).toString().padStart(2, '0')}`;

  return (
    <div key={match._id.toString()} className='p-3 bg-gray-700 rounded flex flex-row'>
      <span className='text-white font-bold text-xl'>{timeUntilEndCleanStr}</span>
      {match.players.map((player) => (

        <div key={player._id.toString()} className='flex gap-1'>
          <FormattedUser user={player} noLinks />

          <span className='self-center p-3'>{match.scoreTable[player._id.toString()]}
          </span>
          {user?._id.toString() === player._id.toString() && (
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
