import React, { useContext } from 'react';
import { toast } from 'react-hot-toast';
import { PageContext } from '../contexts/pageContext';
import MultiplayerMatch from '../models/db/multiplayerMatch';
import { MatchAction, MultiplayerMatchState } from '../models/MultiplayerEnums';
import FormattedUser from './formattedUser';

export default function MultiplayerMatchLobbyItem({ match, onJoinClick, onLeaveClick }: {match: MultiplayerMatch, onJoinClick: (matchId: string) => void, onLeaveClick: (matchId: string) => void}) {
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

    onLeaveClick(matchId);
  };
  const btnJoinMatch = async (matchId: string) => {
    toast.dismiss();
    toast.loading('Joining Match...');
    const res = await fetch(`/api/match/${matchId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: MatchAction.JOIN,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      toast.dismiss();
      toast.error(data.error || 'Failed to join match');
    } else {
      toast.dismiss();
      toast.success('Joined Match');
    }

    onJoinClick(matchId);
  };

  return (
    <div key={match._id.toString()} className='p-3 bg-gray-700 rounded flex flex-row gap-20'>
      <h2>{match.state}</h2>
      {match.players.map((player) => (
        <div key={player._id.toString()}>
          <FormattedUser user={player} />
          {user?._id.toString() !== player._id.toString() && match.state === MultiplayerMatchState.OPEN && (
            <button
              onClick={() => btnJoinMatch(match.matchId)}
              className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'>
        Join
            </button>
          ) }
          {user?._id.toString() === player._id.toString() && (
            <button
              onClick={() => btnLeaveMatch(match.matchId)}
              className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'>
          Leave
            </button>
          )}
        </div>
      ))}

    </div>
  );
}
