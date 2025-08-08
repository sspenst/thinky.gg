import LevelCard from '@root/components/cards/levelCard';
import GameRefactored from '@root/components/level/game-refactored';
import Grid from '@root/components/level/grid';
import HeadToHeadDisplay from '@root/components/multiplayer/headToHeadDisplay';
import MatchResults from '@root/components/multiplayer/matchResults';
import SpaceBackground from '@root/components/page/SpaceBackground';
import { initGameState, MatchGameState } from '@root/helpers/gameStateHelpers';
import useSWRHelper from '@root/hooks/useSWRHelper';
import MultiplayerProfile from '@root/models/db/multiplayerProfile';
import { UserWithMultiMultiplayerProfile, UserWithMultiplayerProfile } from '@root/models/db/user';
import classNames from 'classnames';
import dayjs from 'dayjs';
import { Types } from 'mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import FormattedUser from '../../../../components/formatted/formattedUser';
import MatchChart from '../../../../components/multiplayer/matchChart';
import MatchStatus from '../../../../components/multiplayer/matchStatus';
import Page from '../../../../components/page/page';
import StyledTooltip from '../../../../components/page/styledTooltip';
import Dimensions from '../../../../constants/dimensions';
import { AppContext } from '../../../../contexts/appContext';
import { getGameIdFromReq } from '../../../../helpers/getGameIdFromReq';
import { getMatch } from '../../../../helpers/match/getMatch';
import dbConnect from '../../../../lib/dbConnect';
import { getUserFromToken } from '../../../../lib/withAuth';
import { MatchAction, MatchLogDataGameRecap, MatchLogDataLevelComplete, MatchLogDataUserLeveId, MultiplayerMatchState } from '../../../../models/constants/multiplayer';
import Control from '../../../../models/control';
import Level from '../../../../models/db/level';
import MultiplayerMatch from '../../../../models/db/multiplayerMatch';
import { enrichMultiplayerMatch } from '../../../../models/schemas/multiplayerMatchSchema';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    // redirect to login page
    return {
      redirect: {
        destination: '/login' + (context.resolvedUrl ? '?redirect=' + encodeURIComponent(context.resolvedUrl) : ''),
        permanent: false,
      },
    };
  }

  await dbConnect();

  const { matchId } = context.query;
  let initialMatch = null;

  try {
    // Get the game ID from the request
    const gameId = getGameIdFromReq(context.req);

    // Use the same method as the socket server to get match data
    const match = await getMatch(gameId, matchId as string, reqUser);

    if (match) {
      // Clone and enrich the match data
      const matchClone = JSON.parse(JSON.stringify(match));

      enrichMultiplayerMatch(matchClone, reqUser._id.toString());

      // Ensure all Date objects are serialized to strings for Next.js
      initialMatch = JSON.parse(JSON.stringify(matchClone));
    }
  } catch (error) {
    console.error('Error fetching match:', error);
  }

  return {
    props: {
      initialMatch,
    },
  };
}

interface MatchProps {
  initialMatch?: MultiplayerMatch | null;
}

/* istanbul ignore next */
export default function Match({ initialMatch }: MatchProps) {
  // the current level (for users in game)
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [connectedPlayersInRoom, setConnectedPlayersInRoom] = useState<{count: number, users: UserWithMultiplayerProfile[]}>();
  const [match, setMatch] = useState<MultiplayerMatch | undefined>(initialMatch || undefined);
  const { game, multiplayerSocket, sounds, user } = useContext(AppContext);
  const readyMark = useRef(false);
  const router = useRouter();
  const startSoundPlayed = useRef(false);
  const [usedSkip, setUsedSkip] = useState<boolean>(false);
  const { matchId } = router.query as { matchId: string };

  // map of userId to game state
  const [matchGameStateMap, setMatchGameStateMap] = useState<Record<string, MatchGameState>>({});
  const latestMatchGameStateRef = useRef<MatchGameState | null>(null);

  const matchInProgress = match?.state === MultiplayerMatchState.ACTIVE && match?.timeUntilStart <= 0;
  const iAmPlaying = match?.players.some(player => player._id.toString() === user?._id.toString());
  const isSpectating = !iAmPlaying && match?.state === MultiplayerMatchState.ACTIVE;
  const { data: headToHead, isLoading: loadingHeadToHead } = useSWRHelper(
    '/api/match/head2head?players=' + match?.players.map(player => player._id.toString()).join(','),
    {},
    { revalidateOnFocus: false },
    // only fetch this data if you are playing and are on the ready screen before the match
  ) as {
    data: {
      totalWins: number,
      totalLosses: number,
      totalTies: number,
    },
    isLoading: boolean,
  };

  function getLevelIndexByPlayerId(playerId: string): number {
    if (!match || !(playerId in match.scoreTable)) {
      return -1;
    }

    let levelIndex = match.scoreTable[playerId];

    // account for skip
    if (match.matchLog?.some(log => log.type === MatchAction.SKIP_LEVEL && (log.data as MatchLogDataUserLeveId).userId.toString() === playerId)) {
      levelIndex += 1;
    }

    return levelIndex;
  }

  useEffect(() => {
    const socketConn = io('', {
      path: '/api/socket/',
      withCredentials: true,
      query: {
        matchId: matchId,
      }
    });

    if (isSpectating) {
      socketConn.on('userMatchGameState', (data: { userId: string, matchGameState: MatchGameState }) => {
        const { userId, matchGameState } = data;

        setMatchGameStateMap(prevMatchGameStateMap => {
          const newMatchGameStateMap = { ...prevMatchGameStateMap };

          newMatchGameStateMap[userId] = matchGameState;

          return newMatchGameStateMap;
        });
      });
    }

    socketConn.on('connectedPlayersInRoom', (players: {count: number, users: UserWithMultiMultiplayerProfile[]}) => {
      // loop through players and remove the multiplayerProfiles that aren't matching the current selected game
      players.users = players.users.map(player => {
        if (!player.multiplayerProfile) {
          return player;
        }

        const mp = player.multiplayerProfile as MultiplayerProfile;

        if (mp.gameId?.toString() !== game.toString()) {
          return {
            ...player,
            multiplayerProfile: undefined
          };
        }

        return player;
      });
      setConnectedPlayersInRoom(players as {count: number, users: UserWithMultiplayerProfile[]});
    });
    socketConn.on('match', (match: MultiplayerMatch) => {
      setMatch(match);
    });
    socketConn.on('matchNotFound', () => {
      toast.dismiss();
      toast.error('Match not found');
      router.push('/multiplayer');
    });

    return () => {
      socketConn.off('match');
      socketConn.off('matchNotFound');
      socketConn.off('connectedPlayersInRoom');
      socketConn.off('userMatchGameState');
      socketConn.disconnect();
    };
  }, [game, isSpectating, matchId, router]);

  const [countDown, setCountDown] = useState<number>(-1);

  const btnSkip = useCallback(async() => {
    if (!activeLevel) {
      return;
    }

    if (confirm('Are you sure you want to skip this level? You only get one skip per match.')) {
      toast.dismiss();
      toast.loading('Skipping level...');

      fetch(`/api/match/${matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: MatchAction.SKIP_LEVEL,
          levelId: activeLevel._id.toString(),
        }),
      }).then(res => {
        if (!res.ok) {
          throw res.text();
        }

        toast.dismiss();
        toast.success('Skipped level');
        setUsedSkip(true);
      }).catch(async err => {
        const error = JSON.parse(await err)?.error;

        toast.dismiss();
        toast.error(error || 'Failed to skip level');

        // if data.error contains 'already' then set usedSkip to true
        if (error?.toLowerCase().includes('already')) {
          setUsedSkip(true);
        }
      });
    }
  }, [activeLevel, matchId]);

  const skipControl = useCallback((disabled = false) => new Control(
    'control-skip',
    () => btnSkip(),
    <div className='flex justify-center items-center'>
      <span className='pl-2'>
      Skip
      </span>
      <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='currentColor' className='bi bi-arrow-right-short' viewBox='0 0 16 16'>
        <path fillRule='evenodd' d='M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8z' />
      </svg>
    </div>,
    disabled,
  ), [btnSkip]);

  const emitMatchState = useCallback(async(gameState: MatchGameState) => {
    if (activeLevel) {
      const matchGameState: MatchGameState = { ...gameState, leastMoves: activeLevel.leastMoves };

      multiplayerSocket.socket?.emit('matchGameState', {
        matchId: matchId,
        matchGameState: matchGameState,
      });
    }
  }, [activeLevel, matchId, multiplayerSocket.socket]);

  useEffect(() => {
    // if no match or url is already multiplayer
    if (!match) {
      return;
    }

    if (match.levels.length > 0) {
      // Set the initial match game state for the first level
      const firstLevel = (match.levels as Level[])[0];

      if (firstLevel) {
        const baseState = initGameState(firstLevel.data);
        const initialMatchGameState: MatchGameState = { ...baseState, leastMoves: firstLevel.leastMoves };

        latestMatchGameStateRef.current = initialMatchGameState;
        emitMatchState(initialMatchGameState);
      }

      setActiveLevel((match.levels as Level[])[0]);
    }
  }, [match, router, emitMatchState]);

  // Periodically emit the latest game state every 5 seconds while actively playing
  useEffect(() => {
    if (!matchInProgress || !iAmPlaying) {
      return;
    }

    const intervalId = setInterval(() => {
      if (latestMatchGameStateRef.current) {
        emitMatchState(latestMatchGameStateRef.current);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [emitMatchState, iAmPlaying, matchInProgress]);

  const fetchMarkReady = useCallback(async() => {
    const res = await fetch(`/api/match/${matchId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: MatchAction.MARK_READY,
      }),
    });

    if (res.ok) {
      readyMark.current = true;
    }
  }, [matchId]);

  useEffect(() => {
    if (!match) {
      return;
    }

    const drift = new Date(match.startTime).getTime() - match.timeUntilStart - Date.now();

    const iv = setInterval(async () => {
      const cd = new Date(match.startTime).getTime() - Date.now();
      const ncd = (-drift + cd) / 1000;

      setCountDown(ncd > 0 ? ncd : 0); // TODO. verify this should be -drift not +drift...

      if (match.state === MultiplayerMatchState.ACTIVE) {
        if (ncd > 0) {
          // set the title to the countdown
          document.title = `Starting in ${ncd >> 0} seconds!`;

          if (!startSoundPlayed.current) {
            sounds['start']?.play();
            startSoundPlayed.current = true;
          }
        } else {
          const cdEnd = new Date(match.endTime).getTime() - Date.now();

          const ncdEnd = (-drift + cdEnd) / 1000;

          const players = match.players;
          const player1Name = players[0].name;
          const player2Name = players[1].name;
          const player1Score = match.scoreTable[players[0]._id.toString()];
          const player2Score = match.scoreTable[players[1]._id.toString()];
          const timeUntilEnd = Math.max(ncdEnd, 0);
          const timeUntilEndCleanStr = `${Math.floor(timeUntilEnd / 60)}:${((timeUntilEnd % 60) >> 0).toString().padStart(2, '0')}`;

          document.title = `${timeUntilEndCleanStr} ${player1Name} ${player1Score} - ${player2Score} ${player2Name}`;
        }
      }
    }, 250);

    return () => clearInterval(iv);
  }, [fetchMarkReady, match, sounds]);

  useEffect(() => {
    if (!match) {
      return;
    }

    if (!match.matchLog) {
      match.matchLog = [];
    }

    // check if match already has a GAME_START log
    for (const log of match.matchLog) {
      if (log.type === MatchAction.GAME_START || log.type === MatchAction.GAME_END) {
        return;
      }
    }

    match.matchLog.push({
      type: MatchAction.GAME_START,
      createdAt: match.startTime,
      data: null
    });
    match.matchLog.push({
      type: MatchAction.GAME_END,
      createdAt: match.endTime,
      data: null
    });
  }, [match]);

  if (!match) {
    return (
      <Page title='Loading Match...'>
        <SpaceBackground
          constellationPattern='custom'
          customConstellations={[
            { left: '20%', top: '15%', size: '6px', color: 'bg-blue-400', delay: '0s', duration: '3s', glow: true },
            { left: '40%', top: '20%', size: '5px', color: 'bg-green-400', delay: '0.5s', duration: '2.5s', glow: true },
            { left: '60%', top: '18%', size: '7px', color: 'bg-purple-400', delay: '1s', duration: '3.5s', glow: true },
            { left: '80%', top: '25%', size: '6px', color: 'bg-pink-400', delay: '1.5s', duration: '2.8s', glow: true },
          ]}
          showGeometricShapes={true}
        >
          <div className='relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12'>
            <div className='flex flex-col items-center justify-center min-h-[400px] gap-4 animate-fadeInDown'>
              <div className='relative'>
                <div className='absolute -inset-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-lg opacity-50' />
                <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-8 shadow-lg border border-white/20'>
                  <div className='text-center'>
                    <div className='w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4'>
                      <span className='text-3xl text-white'>⚔️</span>
                    </div>
                    <h1 className='text-2xl font-bold mb-2'>
                      <span className='bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent'>
                        Loading Match
                      </span>
                    </h1>
                    {initialMatch ? (
                      <div className='text-sm text-white/70'>Connecting to live updates...</div>
                    ) : (
                      <div className='text-sm text-white/70'>Fetching match details...</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SpaceBackground>
      </Page>
    );
  }

  match.matchLog = match.matchLog?.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) ?? [];

  const timeUntilEndCleanStr = `${Math.floor(countDown / 60)}:${((countDown % 60) >> 0).toString().padStart(2, '0')}`;

  function getLevelResultIcon(level: Level, userId: string) {
    if (!match || !match.matchLog) {
      return;
    }

    const completedLog = match.matchLog.filter(log => log.type === MatchAction.COMPLETE_LEVEL && (log.data as MatchLogDataLevelComplete).levelId.toString() === level._id.toString() && (log.data as MatchLogDataLevelComplete).userId.toString() === userId);

    if (completedLog.length !== 0) {
      const timestamp = new Date(completedLog[0].createdAt).getTime() - new Date(match.startTime).getTime();

      return (<>
        <div className='rounded-full bg-green-500 border' style={{
          borderColor: 'var(--bg-color-4)',
        }}>
          <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
            <path strokeLinecap='round' strokeLinejoin='round' d='M9 12.75L11.25 15 15 9.75M21 12' />
          </svg>
        </div>
        <div className='text-xs w-8 justify-center flex'>
          {`+${dayjs(timestamp).format('m:ss')}`}
        </div>
      </>);
    }

    const skippedLog = match.matchLog.filter(log => log.type === MatchAction.SKIP_LEVEL && (log.data as MatchLogDataLevelComplete).levelId.toString() === level._id.toString() && (log.data as MatchLogDataLevelComplete).userId.toString() === userId);

    if (skippedLog.length !== 0) {
      const timestamp = new Date(skippedLog[0].createdAt).getTime() - new Date(match.startTime).getTime();

      return (<>
        <div data-tooltip-id='skipped' data-tooltip-content={'Skipped'} className='rounded-full bg-blue-500 border' style={{
          borderColor: 'var(--bg-color-4)',
        }}>
          <svg xmlns='http://www.w3.org/2000/svg' fill='currentColor' className='w-6 h-6 bi bi-arrow-right-short' viewBox='0 0 16 16'>
            <path fillRule='evenodd' d='M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8z' />
          </svg>
        </div>
        <StyledTooltip id='skipped' />
        <div className='text-xs w-8 justify-center flex'>
          {`+${dayjs(timestamp).format('m:ss')}`}
        </div>
      </>);
    }

    return (<>
      <div className='rounded-full bg-neutral-500 border' style={{
        borderColor: 'var(--bg-color-4)',
      }}>
        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M16 12H8' />
        </svg>
      </div>
      <div className='text-xs w-8 justify-center flex' style={{ minWidth: 32 }}>
        {'-'}
      </div>
    </>);
  }

  const levelResults = [];

  for (let i = 0; i < match.levels.length; i++) {
    const level = match.levels[i] as Level;

    if (!level) {
      continue;
    }

    levelResults.push(
      <div className='flex justify-center items-center flex-wrap gap-2' key={`level-result-${level._id.toString()}`}>
        <div className='flex flex-row items-center gap-4'>
          <div className='text-2xl font-bold w-10 text-right'>
            {i + 1}.
          </div>
          <LevelCard
            id='match'
            level={level}
          />
        </div>
        <div className='flex flex-col gap-2 justify-left truncate'>
          {match.players.map(player => (
            <div className='flex flex-row gap-2 items-center' key={player._id.toString()}>
              {getLevelResultIcon(level, player._id.toString())}
              <FormattedUser id={`match-level-${i}`} size={Dimensions.AvatarSizeSmall} user={player} />
            </div>
          ))}
        </div>
      </div>
    );

    // show the last level seen by either user then break
    if (!match.matchLog?.some(log => (log.type === MatchAction.COMPLETE_LEVEL || log.type === MatchAction.SKIP_LEVEL) && (log.data as MatchLogDataLevelComplete).levelId.toString() === level._id.toString())) {
      break;
    }
  }

  if (!user) {
    return <span>Loading...</span>;
  }

  const playersNotMarkedReady = match.players.filter(player => !(match.markedReady as string[]).includes(player._id.toString()));
  const prettyMatchState = ({
    [MultiplayerMatchState.OPEN]: 'Match Open',
    [MultiplayerMatchState.FINISHED]: 'Match Finished',
    [MultiplayerMatchState.ACTIVE]: 'Match about to begin',
    [MultiplayerMatchState.ABORTED]: 'Match Aborted',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)[match.state];

  return (
    <Page
      isFullScreen={match.state === MultiplayerMatchState.ACTIVE && iAmPlaying}
      title='Multiplayer Match'
    >
      <SpaceBackground
        constellationPattern='custom'
        customConstellations={[
          { left: '15%', top: '12%', size: '6px', color: 'bg-red-400', delay: '0s', duration: '3s', glow: true },
          { left: '35%', top: '18%', size: '5px', color: 'bg-orange-400', delay: '0.8s', duration: '2.5s', glow: true },
          { left: '55%', top: '15%', size: '7px', color: 'bg-yellow-400', delay: '1.2s', duration: '3.5s', glow: true },
          { left: '75%', top: '20%', size: '6px', color: 'bg-green-400', delay: '1.8s', duration: '2.8s', glow: true },
          { left: '85%', top: '25%', size: '5px', color: 'bg-blue-400', delay: '2.2s', duration: '3.2s', glow: true },
          { left: '25%', top: '30%', size: '6px', color: 'bg-purple-400', delay: '0.5s', duration: '2.9s', glow: true },
        ]}
        showGeometricShapes={true}
        useFullHeight={matchInProgress}
      >
        <div className={classNames('relative max-w-7xl mx-auto px-4 sm:px-6', {
          'py-8 sm:py-12': !matchInProgress,
          'h-full flex flex-col': matchInProgress
        })}>
          {/* Header Section - Hidden during active match */}
          <div className={classNames('text-center mb-8 animate-fadeInDown', { 'hidden': matchInProgress })}>
            <h1 className='font-bold text-3xl sm:text-4xl lg:text-5xl mb-4'>
              <span className='bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent'>
                {prettyMatchState}
              </span>
            </h1>
          </div>
          {/* Head to Head Display */}
          {!matchInProgress && !loadingHeadToHead && match.players.length === 2 && headToHead && (
            <div className='flex justify-center mb-6 animate-fadeInUp' style={{ animationDelay: '0.2s' }}>
              <div className='relative'>
                <div className='absolute -inset-2 bg-gradient-to-r from-blue-600/15 to-purple-600/15 blur-lg opacity-40' />
                <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
                  <HeadToHeadDisplay
                    player1Name={match.players[0].name}
                    player2Name={match.players[1]?.name || ''}
                    wins={headToHead.totalWins}
                    losses={headToHead.totalLosses}
                    ties={headToHead.totalTies}
                    className='max-w-md'
                  />
                </div>
              </div>
            </div>
          )}
          {/* Aborted Match Info */}
          {match.state === MultiplayerMatchState.ABORTED && (
            <div className='flex justify-center mb-6 animate-fadeInUp' style={{ animationDelay: '0.3s' }}>
              <div className='relative'>
                <div className='absolute -inset-2 bg-gradient-to-r from-red-600/15 to-pink-600/15 blur-lg opacity-40' />
                <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
                  <div className='text-center'>
                    <div className='w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3'>
                      <span className='text-2xl text-white'>❌</span>
                    </div>
                    <h3 className='text-lg font-bold mb-2'>
                      <span className='bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent'>
                        Match Aborted
                      </span>
                    </h3>
                    <div className='space-y-1'>
                      {playersNotMarkedReady.map(player => (
                        <div key={player._id.toString()} className='text-sm text-white/70'>
                          {player.name} did not mark ready
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Spectator Count */}
          {connectedPlayersInRoom && connectedPlayersInRoom.count > 2 && (
            <div className='absolute top-4 right-4 animate-fadeInRight'>
              <div className='bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1 border border-white/20'>
                <span className='text-sm text-white/80'>
                  👁️ {connectedPlayersInRoom.count - 2} spectating
                </span>
              </div>
            </div>
          )}
          {/* Finished/Spectating Match View */}
          {match.state === MultiplayerMatchState.FINISHED || match.state === MultiplayerMatchState.ABORTED || isSpectating ? (
            <div className='flex flex-col items-center justify-center gap-8 animate-fadeInUp' style={{ animationDelay: '0.4s' }}>
              {/* Back Button */}
              <div className='text-center'>
                <Link
                  className='group relative inline-flex items-center justify-center gap-2 overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300'
                  href='/multiplayer'
                >
                  <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-700' />
                  <span className='relative'>←</span>
                  <span className='relative'>Back to Multiplayer</span>
                </Link>
              </div>
            <MatchResults match={match} recap={match.matchLog?.find(log => log.type === MatchAction.GAME_RECAP)?.data as MatchLogDataGameRecap} showViewLink={false} />
              {/* Live Spectator Grids */}
              {match.state !== MultiplayerMatchState.FINISHED && match.state !== MultiplayerMatchState.ABORTED && (
                <div className='w-full max-w-6xl'>
                  <h2 className='text-2xl font-bold text-center mb-6'>
                    <span className='bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent'>
                      Live Match View
                    </span>
                  </h2>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    {match.players.map(player => {
                      const playerId = player._id.toString();
                      const matchGameState = matchGameStateMap[playerId];
                      const levelIndex = getLevelIndexByPlayerId(playerId);

                      if (levelIndex === -1) {
                        return null;
                      }

                      const level = match.levels[levelIndex] as Level;

                      return (
                        <div className='relative' key={`match-game-state-${player._id.toString()}-${level._id.toString()}`}>
                          <div className='absolute -inset-2 bg-gradient-to-r from-green-600/15 to-blue-600/15 blur-lg opacity-40' />
                          <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-4 shadow-lg border border-white/20'>
                            <div className='flex flex-col items-center gap-3'>
                              <div className='flex items-center gap-2'>
                                <span className='text-lg'>🎮</span>
                                <FormattedUser id='match-recap' size={Dimensions.AvatarSizeSmall} user={player} />
                              </div>
                              <div className='flex flex-col justify-center text-center w-full bg-white/5 rounded-lg p-4' style={{
                                height: '50vh',
                              }}>
                                {matchGameState ?
                                  <Grid
                                    gameState={matchGameState}
                                    id={level._id.toString()}
                                    leastMoves={matchGameState.leastMoves || 0}
                                    optimizeDom
                                  />
                                  :
                                  <span className='italic text-white/60'>Waiting for move...</span>
                                }
                              </div>
                              <Link className='font-medium text-blue-400 hover:text-blue-300 underline truncate max-w-full transition-colors duration-200' href={`/level/${level.slug}`}>
                                {level.name}
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Match Chart */}
              <div className='w-full max-w-screen-lg'>
                <div className='relative'>
                  <div className='absolute -inset-2 bg-gradient-to-r from-cyan-600/15 to-blue-600/15 blur-lg opacity-40' />
                  <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
                    <h2 className='text-xl font-bold text-center mb-4'>
                      <span className='bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent'>
                        Match Progress
                      </span>
                    </h2>
                    <div className='h-96'>
                      <MatchChart match={match} />
                    </div>
                  </div>
                </div>
              </div>
              {/* Level Results */}
              <div className='w-full max-w-4xl'>
                <h2 className='text-2xl font-bold text-center mb-6'>
                  <span className='bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent'>
                    Level Breakdown
                  </span>
                </h2>
                <div className='flex flex-col gap-6'>
                  {levelResults.reverse().map((result, index) => (
                    <div key={index} className='relative animate-fadeInUp' style={{ animationDelay: `${index * 0.1}s` }}>
                      <div className='absolute -inset-2 bg-gradient-to-r from-purple-600/15 to-pink-600/15 blur-lg opacity-40' />
                      <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
                        {result}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className={classNames('flex flex-col items-center gap-6 mb-4', {
              'min-h-screen justify-center': !matchInProgress,
              'flex-1 justify-start': matchInProgress
            })}>
              {/* Countdown Display */}
              {countDown > 0 && (
                <div className='relative animate-pulse'>
                  <div className='absolute -inset-2 bg-gradient-to-r from-red-600/20 to-orange-600/20 blur-lg opacity-50' />
                  <div className='relative bg-white/10 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
                    <h1 className='text-2xl font-bold text-center'>
                      <span className='bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent'>
                        Starting in {timeUntilEndCleanStr}
                      </span>
                    </h1>
                  </div>
                </div>
              )}
              {/* Ready Status */}
              {match.state === MultiplayerMatchState.ACTIVE && match.timeUntilStart > 0 && (
                <div className='relative animate-fadeInUp' style={{ animationDelay: '0.2s' }}>
                  <div className='absolute -inset-2 bg-gradient-to-r from-green-600/15 to-blue-600/15 blur-lg opacity-40' />
                  <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
                    <div className='text-center'>
                      <div className='w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3'>
                        {match.markedReady.length == 2 ? (
                          <span className='text-2xl text-white'>✅</span>
                        ) : (
                          <span className='text-2xl text-white'>⏳</span>
                        )}
                      </div>
                      {match.markedReady.length == 2 && (
                        <div className='text-green-400 font-semibold'>Both players ready!</div>
                      )}
                      {match.markedReady.length === 0 && user && !(match.markedReady as Types.ObjectId[]).includes(user._id) && (
                        <div className='text-yellow-400'>Not ready</div>
                      )}
                      {match.markedReady.length === 1 && user && !(match.markedReady as Types.ObjectId[]).includes(user._id) && (
                        <div className='text-blue-400'>Other player is ready!</div>
                      )}
                      {match.markedReady.length !== 2 && user && (match.markedReady as Types.ObjectId[]).includes(user._id) && (
                        <div className='text-purple-400'>Waiting on other player...</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* Mark Ready Button */}
              {match.state === MultiplayerMatchState.ACTIVE && match.timeUntilStart > 0 && user && !(match.markedReady as Types.ObjectId[]).includes(user._id) && (
                <div className='relative animate-fadeInUp' style={{ animationDelay: '0.4s' }}>
                  <div className='flex flex-col gap-4 justify-center items-center'>
                    <svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' fill='currentColor' className='animate-bounce text-green-400' viewBox='0 0 16 16'>
                      <path d='M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v5.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V4.5z' />
                    </svg>
                    <button
                      className='group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 animate-pulse'
                      onClick={(e: React.MouseEvent) => {
                        const targetButton = e.currentTarget as HTMLButtonElement;

                        targetButton.disabled = true;
                        targetButton.classList.add('opacity-50');
                        targetButton.classList.remove('animate-pulse');
                        targetButton.innerText = 'Marking...';
                        fetchMarkReady();
                      }}
                    >
                      <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-700' />
                      <div className='relative flex items-center gap-2'>
                        <span>✓</span>
                        <span>Mark Ready</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
              {/* Match Status */}
              <div className='w-full max-w-4xl animate-fadeInUp' style={{ animationDelay: '0.6s' }}>
                <MatchStatus
                  isMatchPage={true}
                  match={match}
                  onLeaveClick={() => {
                    router.reload();
                  }}
                />
              </div>
            {activeLevel && (
              <div className='grow h-full w-full' key={'div-' + activeLevel._id.toString()}>
                <GameRefactored
                  disableCheckpoints={true}
                  enableSessionCheckpoint={false}
                  extraControls={[skipControl(usedSkip)]}
                  key={'game-' + activeLevel._id.toString()}
                  level={activeLevel}
                  matchId={match.matchId}
                  onMove={(gameState) => {
                    const matchGameState: MatchGameState = { ...gameState, leastMoves: activeLevel.leastMoves };

                    latestMatchGameStateRef.current = matchGameState;
                    emitMatchState(matchGameState);
                  }}
                />
              </div>
              )}
            </div>
          )}
        </div>
      </SpaceBackground>
    </Page>
  );
}
