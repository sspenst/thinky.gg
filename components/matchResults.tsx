import { multiplayerMatchTypeToText } from '@root/helpers/multiplayerHelperFunctions';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import { MatchLogDataGameRecap } from '@root/models/MultiplayerEnums';
import Link from 'next/link';
import React from 'react';
import FormattedDate from './formattedDate';
import FormattedUser from './formattedUser';
import { getProfileRatingDisplay } from './matchStatus';
import StyledTooltip from './styledTooltip';

interface MatchResultsProps {
  match: MultiplayerMatch;
  recap?: MatchLogDataGameRecap;
  showViewLink: boolean;
}

export default function MatchResults({ match, recap, showViewLink }: MatchResultsProps) {
  const sortedPlayers = match.players.sort((p1, p2) => {
    const p1Score = match.scoreTable[p1._id.toString()];
    const p2Score = match.scoreTable[p2._id.toString()];

    if (p1Score !== p2Score) {
      return p1Score < p2Score ? 1 : -1;
    } else {
      return p1.name > p2.name ? 1 : -1;
    }
  });

  return (
    <div
      className='flex flex-col flex-wrap justify-center gap-4 py-3 px-4 border rounded-md shadow-lg items-center w-fit max-w-full'
      style={{
        backgroundColor: 'var(--bg-color-2)',
        borderColor: 'var(--bg-color-3)',
      }}
    >
      <div className='flex gap-2 items-center max-w-full'>
        {showViewLink &&
          <Link
            className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2'
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
          <FormattedDate date={match.endTime} />
        </div>
        <div className='flex flex-col gap-1 truncate pr-0.5'>
          {sortedPlayers.map((player) => (
            <div
              className='flex gap-2 items-center'
              key={player._id.toString()}
              style={{
                backgroundColor: (match.winners as string[])?.includes(player._id.toString()) ? 'var(--bg-color-4)' : '',
                // rounded corners
                borderRadius: 4,
                // padding
                padding: '0 0.315rem',
              }}
            >
              {player._id.toString() in match.scoreTable &&
                <span className='font-bold text-2xl w-10 text-center' style={{ minWidth: 40 }}>
                  {match.scoreTable[player._id.toString()]}
                </span>
              }
              <FormattedUser user={player} />
              {getProfileRatingDisplay({ type: match.type, profile: player.multiplayerProfile, hideType: true })}
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
      </div>
    </div>
  );
}
