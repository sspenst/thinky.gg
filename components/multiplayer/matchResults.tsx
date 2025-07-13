import Dimensions from '@root/constants/dimensions';
import { GameId } from '@root/constants/GameId';
import { AppContext } from '@root/contexts/appContext';
import { multiplayerMatchTypeToText } from '@root/helpers/multiplayerHelperFunctions';
import { MatchLogDataGameRecap, MultiplayerMatchState } from '@root/models/constants/multiplayer';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import Link from 'next/link';
import React, { useContext, useEffect } from 'react';
import FormattedDate from '../formatted/formattedDate';
import FormattedUser from '../formatted/formattedUser';
import GameLogo from '../gameLogo';
import StyledTooltip from '../page/styledTooltip';
import MultiplayerRating from './multiplayerRating';

interface MatchResultsProps {
  match: MultiplayerMatch;
  recap?: MatchLogDataGameRecap;
  showViewLink: boolean;
}

export default function MatchResults({ match, recap, showViewLink }: MatchResultsProps) {
  const { game } = useContext(AppContext);
  const showGameLabel = game.id === GameId.THINKY;

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
      className='flex flex-col flex-wrap gap-4 py-3 px-4 border rounded-md shadow-lg  w-full max-w-full relative'
      style={{
        backgroundColor: 'var(--bg-color-2)',
        borderColor: 'var(--bg-color-3)',
      }}
    >

      <div className='flex flex-row gap-2 items-center max-w-full'>
        <div className='flex flex-col gap-1 items-center'>
          {showGameLabel && <div className='' data-tooltip-content={match.gameId || game.id} data-tooltip-id={'game-label-tooltip-' + match._id.toString()}>
            <GameLogo clickable gameId={match.gameId || game.id} id={'level'} size={24} />
            <StyledTooltip id={'game-label-tooltip-' + match._id.toString()} />
          </div>}
          {showViewLink &&
            <Link
              className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-1 md:py-2 md:px-4 rounded m-1 md:mr-2'
              href={`/match/${match.matchId}`}
            >
            View
            </Link>
          }
        </div>
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
              className='flex gap-0 items-left'
              key={player._id.toString()}
            >
              {player._id.toString() in match.scoreTable &&
                <span className='font-bold text-2xl min-w-10 text-center'>
                  {match.scoreTable[player._id.toString()]}
                </span>
              }
              <FormattedUser size={Dimensions.AvatarSizeSmall} id='match-result' user={player} />
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
