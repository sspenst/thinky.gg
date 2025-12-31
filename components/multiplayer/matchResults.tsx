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
    <div className='relative'>
      <div className='absolute -inset-1 bg-linear-to-r from-cyan-600/20 to-blue-600/20 blur-xs opacity-50' />
      <div className='relative flex flex-col gap-4 py-4 px-4 sm:px-6 bg-white/8 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 w-full'>

        {/* Header Row */}
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
          <div className='flex items-center gap-3'>
            {showGameLabel && (
              <div data-tooltip-content={match.gameId || game.id} data-tooltip-id={'game-label-tooltip-' + match._id.toString()}>
                <GameLogo clickable gameId={match.gameId || game.id} id={'level'} size={24} />
                <StyledTooltip id={'game-label-tooltip-' + match._id.toString()} />
              </div>
            )}

            {/* Match Type and Status */}
            <div className='flex flex-col gap-1'>
              <div className='bg-linear-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-xs rounded-lg px-3 py-1 border border-white/20 inline-flex'>
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
            </div>
          </div>

          {/* Time and Actions */}
          <div className='flex items-center gap-3'>
            <div className='text-sm text-white/60'>
              {match.state !== MultiplayerMatchState.ACTIVE ? <FormattedDate date={match.endTime} /> : timeUntilEndCleanStr}
            </div>
            {showViewLink && (
              <Link
                className='bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200'
                href={`/match/${match.matchId}`}
              >
                View
              </Link>
            )}
          </div>
        </div>
        {/* Players List */}
        <div className='flex flex-col gap-2'>
          {sortedPlayers.map((player, index) => (
            <div
              className={`flex items-center gap-3 rounded-lg p-2 border ${
                index === 0 && sortedPlayers.length > 1
                  ? 'bg-linear-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30'
                  : 'bg-white/5 border-white/10'
              }`}
              key={player._id.toString()}
            >
              {/* Score */}
              {player._id.toString() in match.scoreTable && (
                <div className='bg-linear-to-r from-cyan-500/20 to-blue-500/20 rounded-lg px-3 py-1 min-w-12 text-center'>
                  <span className='font-bold text-2xl text-cyan-300'>
                    {match.scoreTable[player._id.toString()]}
                  </span>
                </div>
              )}

              {/* Emoji Icon */}
              <span className='text-lg'>
                {index === 0 && sortedPlayers.length > 1 ? '🏆' : '🎮'}
              </span>

              {/* Player Info */}
              <div className='flex-1'>
                <FormattedUser size={Dimensions.AvatarSizeSmall} id='match-result' user={player} />
              </div>

              {/* Rating and Changes */}
              <div className='flex items-center gap-2'>
                <MultiplayerRating hideType profile={player.multiplayerProfile} type={match.type} />
                {recap?.winner?.userId.toString() === player._id.toString() && (
                  <span className='text-xs text-green-400 font-semibold'>
                    {`(${Math.round(recap.eloChangeWinner) >= 0 ? '+' : ''}${Math.round(recap.eloChangeWinner)})`}
                  </span>
                )}
                {recap?.loser?.userId.toString() === player._id.toString() && (
                  <span className='text-xs text-red-400 font-semibold'>
                    {`(${Math.round(recap.eloChangeLoser) >= 0 ? '+' : ''}${Math.round(recap.eloChangeLoser)})`}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
