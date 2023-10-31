import { multiplayerMatchTypeToText } from '@root/helpers/multiplayerHelperFunctions';
import { MatchLogDataGameRecap, MultiplayerMatchState } from '@root/models/constants/multiplayer';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import Link from 'next/link';
import React, { useEffect } from 'react';
import FormattedDate from '../formatted/formattedDate';
import FormattedUser from '../formatted/formattedUser';
import StyledTooltip from '../page/styledTooltip';
import MultiplayerRating from './multiplayerRating';

interface MatchResultsProps {
  match: MultiplayerMatch;
  recap?: MatchLogDataGameRecap;
  showViewLink: boolean;
}

export default function MatchResults({ match, recap, showViewLink }: MatchResultsProps) {
  const sortedPlayers = [...match.players].sort((p1, p2) => {
    const p1Score = match.scoreTable[p1._id.toString()];
    const p2Score = match.scoreTable[p2._id.toString()];

    if (p1Score !== p2Score) {
      return p1Score < p2Score ? 1 : -1;
    } else {
      return p1.name > p2.name ? 1 : -1;
    }
  });
  const [countDown, setCountDown] = React.useState<number>(0);

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
          { match.state !== MultiplayerMatchState.ACTIVE ? <FormattedDate date={match.endTime} /> : timeUntilEndCleanStr }
        </div>
        <div className='flex flex-col gap-1 truncate pr-0.5'>
          {sortedPlayers.map((player) => (
            <div
              className='flex gap-2 items-center'
              key={player._id.toString()}
            >
              {player._id.toString() in match.scoreTable &&
                <span className='font-bold text-2xl w-10 text-center' style={{ minWidth: 40 }}>
                  {match.scoreTable[player._id.toString()]}
                </span>
              }
              <FormattedUser id='match-result' user={player} />
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
      </div>
    </div>
  );
}
