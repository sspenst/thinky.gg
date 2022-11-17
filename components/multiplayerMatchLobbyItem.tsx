import React, { useContext } from 'react';
import { PageContext } from '../contexts/pageContext';
import MultiplayerMatch from '../models/db/multiplayerMatch';
import { MultiplayerMatchState } from '../models/MultiplayerEnums';
import FormattedUser from './formattedUser';

export default function MultiplayerMatchLobbyItem({ match, onJoinClick, onLeaveClick }: {match: MultiplayerMatch, onJoinClick: (matchId: string) => void, onLeaveClick: (matchId: string) => void}) {
  const { user } = useContext(PageContext);

  return (
    <div key={match._id.toString()} className='p-3 bg-gray-700 rounded flex flex-row gap-20'>
      {match.players.map((player) => (
        <div key={player._id.toString()}>
          <FormattedUser user={player} />
          {user?._id.toString() !== player._id.toString() && match.state === MultiplayerMatchState.OPEN && (
            <button
              onClick={() => onJoinClick(match.matchId)}
              className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'>
        Join
            </button>
          ) }
          {user?._id.toString() === player._id.toString() && (
            <button
              onClick={() => onLeaveClick(match.matchId)}
              className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'>
          Leave
            </button>
          )}
        </div>
      ))}

    </div>
  );
}
