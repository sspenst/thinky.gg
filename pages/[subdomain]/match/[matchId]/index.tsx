import AbortedMatchInfo from '@root/components/multiplayer/abortedMatchInfo';
import CountdownDisplay from '@root/components/multiplayer/countdownDisplay';
import HeadToHeadDisplay from '@root/components/multiplayer/headToHeadDisplay';
import LevelResultsSection from '@root/components/multiplayer/levelResultsSection';
import LiveSpectatorGrids from '@root/components/multiplayer/liveSpectatorGrids';
import MarkReadyButton from '@root/components/multiplayer/markReadyButton';
import MatchChart from '@root/components/multiplayer/matchChart';
import MatchChat from '@root/components/multiplayer/matchChat';
import MatchGameplay from '@root/components/multiplayer/matchGameplay';
import MatchHeader from '@root/components/multiplayer/matchHeader';
import MatchLoadingScreen from '@root/components/multiplayer/matchLoadingScreen';
import MatchResults from '@root/components/multiplayer/matchResults';
import MatchStatus from '@root/components/multiplayer/matchStatus';
import ReadyStatus from '@root/components/multiplayer/readyStatus';
import SpectatorCount from '@root/components/multiplayer/spectatorCount';
import MultiSelectUser from '@root/components/page/multiSelectUser';
import Page from '@root/components/page/page';
import SpaceBackground from '@root/components/page/SpaceBackground';
import { initGameState, MatchGameState } from '@root/helpers/gameStateHelpers';
import { getLevelIndexByPlayerId, getPrettyMatchState, isMatchInProgress, isPlayerPlaying, isSpectating } from '@root/helpers/match/matchUtils';
import { useMatchSocket } from '@root/hooks/useMatchSocket';
import useSWRHelper from '@root/hooks/useSWRHelper';
import classNames from 'classnames';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../../../../contexts/appContext';
import { getGameIdFromReq } from '../../../../helpers/getGameIdFromReq';
import { getMatch } from '../../../../helpers/match/getMatch';
import dbConnect from '../../../../lib/dbConnect';
import { getUserFromToken } from '../../../../lib/withAuth';
import { MatchAction, MatchLogDataGameRecap, MultiplayerMatchState } from '../../../../models/constants/multiplayer';
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
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [usedSkip, setUsedSkip] = useState<boolean>(false);
  const [countDown, setCountDown] = useState<number>(-1);
  const [showInvitePanel, setShowInvitePanel] = useState<boolean>(false);
  const [isInviting, setIsInviting] = useState<boolean>(false);
  const { multiplayerSocket, sounds, user } = useContext(AppContext);
  const readyMark = useRef(false);
  const router = useRouter();
  const startSoundPlayed = useRef(false);
  const latestMatchGameStateRef = useRef<MatchGameState | null>(null);
  const { matchId } = router.query as { matchId: string };

  // Use custom hook for socket management
  const socketIsSpectating = isSpectating(initialMatch, user?._id.toString());
  const { match, connectedPlayersInRoom, matchGameStateMap } = useMatchSocket({
    matchId,
    isSpectating: socketIsSpectating,
  });

  // Use the socket match data if available, fallback to initial match
  const currentMatch = match || initialMatch;

  // Calculate derived state
  const matchInProgress = isMatchInProgress(currentMatch);
  const iAmPlaying = isPlayerPlaying(currentMatch, user?._id.toString());
  const prettyMatchState = getPrettyMatchState(currentMatch?.state || MultiplayerMatchState.OPEN);
  const { data: headToHead, isLoading: loadingHeadToHead } = useSWRHelper(
    '/api/match/head2head?players=' + currentMatch?.players.map(player => player._id.toString()).join(','),
    {},
    { revalidateOnFocus: false },
  ) as {
    data: {
      totalWins: number,
      totalLosses: number,
      totalTies: number,
    },
    isLoading: boolean,
  };

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
    if (!currentMatch) {
      return;
    }

    if (currentMatch.levels.length > 0) {
      const firstLevel = (currentMatch.levels as Level[])[0];

      if (firstLevel) {
        const baseState = initGameState(firstLevel.data);
        const initialMatchGameState: MatchGameState = { ...baseState, leastMoves: firstLevel.leastMoves };

        latestMatchGameStateRef.current = initialMatchGameState;
        emitMatchState(initialMatchGameState);
      }

      setActiveLevel((currentMatch.levels as Level[])[0]);
    }
  }, [currentMatch, emitMatchState]);

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

  const fetchUnmarkReady = useCallback(async() => {
    const res = await fetch(`/api/match/${matchId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: MatchAction.UNMARK_READY,
      }),
    });

    if (res.ok) {
      readyMark.current = false;
    }
  }, [matchId]);

  const sendChatMessage = useCallback(async(message: string) => {
    const res = await fetch(`/api/match/${matchId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: MatchAction.SEND_CHAT_MESSAGE,
        message: message,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to send message' }));
      toast.error(errorData.error || 'Failed to send message');
      console.error('Failed to send chat message:', errorData);
    }
  }, [matchId]);

  const handleInviteUser = useCallback(async(selectedUser: any) => {
    if (!selectedUser || isInviting) {
      return;
    }

    console.log('Inviting user:', selectedUser);
    console.log('Match ID:', matchId);
    setIsInviting(true);

    try {
      const res = await fetch(`/api/match/${matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: MatchAction.INVITE_USER,
          invitedUserId: selectedUser._id,
        }),
      });

      console.log('Response status:', res.status);

      if (res.ok) {
        setShowInvitePanel(false);
        toast.success(`Invitation sent to ${selectedUser.name}!`);
      } else {
        const error = await res.json();

        toast.error(`Failed to send invitation: ${error.error}`);
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation. Please try again.');
    } finally {
      setIsInviting(false);
    }
  }, [matchId, isInviting]);

  useEffect(() => {
    if (!currentMatch) {
      return;
    }

    const drift = new Date(currentMatch.startTime).getTime() - currentMatch.timeUntilStart - Date.now();

    const iv = setInterval(async () => {
      const cd = new Date(currentMatch.startTime).getTime() - Date.now();
      const ncd = (-drift + cd) / 1000;

      setCountDown(ncd > 0 ? ncd : 0);

      if (currentMatch.state === MultiplayerMatchState.ACTIVE) {
        if (ncd > 0) {
          document.title = `Starting in ${ncd >> 0} seconds!`;

          if (!startSoundPlayed.current) {
            sounds['start']?.play();
            startSoundPlayed.current = true;
          }
        } else {
          const cdEnd = new Date(currentMatch.endTime).getTime() - Date.now();
          const ncdEnd = (-drift + cdEnd) / 1000;

          const players = currentMatch.players;
          const player1Name = players[0].name;
          const player2Name = players[1].name;
          const player1Score = currentMatch.scoreTable[players[0]._id.toString()];
          const player2Score = currentMatch.scoreTable[players[1]._id.toString()];
          const timeUntilEnd = Math.max(ncdEnd, 0);
          const timeUntilEndCleanStr = `${Math.floor(timeUntilEnd / 60)}:${((timeUntilEnd % 60) >> 0).toString().padStart(2, '0')}`;

          document.title = `${timeUntilEndCleanStr} ${player1Name} ${player1Score} - ${player2Score} ${player2Name}`;
        }
      }
    }, 250);

    return () => clearInterval(iv);
  }, [currentMatch, sounds]);

  useEffect(() => {
    if (!currentMatch) {
      return;
    }

    if (!currentMatch.matchLog) {
      currentMatch.matchLog = [];
    }

    // check if match already has a GAME_START log
    for (const log of currentMatch.matchLog) {
      if (log.type === MatchAction.GAME_START || log.type === MatchAction.GAME_END) {
        return;
      }
    }

    currentMatch.matchLog.push({
      type: MatchAction.GAME_START,
      createdAt: currentMatch.startTime,
      data: null
    });
    currentMatch.matchLog.push({
      type: MatchAction.GAME_END,
      createdAt: currentMatch.endTime,
      data: null
    });
  }, [currentMatch]);

  if (!currentMatch) {
    return <MatchLoadingScreen initialMatch={Boolean(initialMatch)} />;
  }

  currentMatch.matchLog = currentMatch.matchLog?.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) ?? [];

  if (!user) {
    return <span>Loading...</span>;
  }

  const currentIsSpectating = isSpectating(currentMatch, user._id.toString());

  return (
    <Page
      title='Multiplayer Match'
      isFullScreen={matchInProgress && !currentIsSpectating}
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
        useFullHeight={matchInProgress && iAmPlaying}
      >
        <div className={classNames('relative max-w-7xl mx-auto px-2 sm:px-4 lg:px-6', {
          'py-4 sm:py-8': !(matchInProgress && iAmPlaying),
          'h-full flex flex-col': matchInProgress && iAmPlaying
        })} style={{ minHeight: matchInProgress && iAmPlaying ? '0' : 'auto' }}>

          <MatchHeader matchInProgress={matchInProgress} prettyMatchState={prettyMatchState} />

          {/* Head to Head Display */}
          {!matchInProgress && !loadingHeadToHead && currentMatch.players.length === 2 && headToHead && (
            <div className='flex justify-center animate-fadeInUp' style={{ animationDelay: '0.2s' }}>
              <div className='relative'>
                <div className='absolute -inset-2 bg-gradient-to-r from-blue-600/15 to-purple-600/15 blur-lg opacity-40' />
                <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
                  <HeadToHeadDisplay
                    player1Name={currentMatch.players[0].name}
                    player2Name={currentMatch.players[1]?.name || ''}
                    wins={headToHead.totalWins}
                    losses={headToHead.totalLosses}
                    ties={headToHead.totalTies}
                    className='max-w-md'
                  />
                </div>
              </div>
            </div>
          )}

          <AbortedMatchInfo match={currentMatch} />
          <SpectatorCount connectedPlayersInRoom={connectedPlayersInRoom} matchState={currentMatch?.state} />

          {/* Finished/Spectating Match View */}
          {currentMatch.state === MultiplayerMatchState.FINISHED || currentMatch.state === MultiplayerMatchState.ABORTED || currentIsSpectating ? (
            <div className='flex flex-col items-center justify-center gap-8 animate-fadeInUp' style={{ animationDelay: '0.4s' }}>

              <div className='text-center mt-4'>
                <Link
                  className='group relative inline-flex items-center justify-center gap-2 overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300'
                  href='/multiplayer'
                >
                  <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-700' />
                  <span className='relative'>←</span>
                  <span className='relative'>Back to Multiplayer</span>
                </Link>
              </div>
              <div className='flex flex-col lg:flex-row items-center justify-center gap-8 w-full max-w-7xl'>
                <div className='flex flex-col items-center gap-8 flex-1'>
                  <div className='flex flex-col md:flex-row gap-8 items-center'>
                  <MatchResults
                    match={currentMatch}
                    recap={currentMatch.matchLog?.find(log => log.type === MatchAction.GAME_RECAP)?.data as MatchLogDataGameRecap}
                    showViewLink={false}
                  />
                   {/* Chat for post-game and spectators - everyone can see */}
                   {user && (
                      <MatchChat
                        match={currentMatch}
                        user={user}
                        onSendMessage={sendChatMessage}
                        showSpectatorNotice={matchInProgress && currentIsSpectating}
                        connectedUsersCount={connectedPlayersInRoom?.count}
                      />
                    )}
                  </div>
                  <LiveSpectatorGrids
                    match={currentMatch}
                    matchGameStateMap={matchGameStateMap}
                    getLevelIndexByPlayerId={(playerId: string) => getLevelIndexByPlayerId(currentMatch, playerId)}
                  />

                  <div className='w-full max-w-screen-lg flex flex-col md:flex-row items-center md:items-center gap-8 mx-auto'>
                    <div className='flex-1'>
                      <div className='relative'>
                        <div className='absolute -inset-2 bg-gradient-to-r from-cyan-600/15 to-blue-600/15 blur-lg opacity-40' />
                        <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
                          <h2 className='text-xl font-bold text-center mb-4'>
                            <span className='bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent'>
                              Match Progress
                            </span>
                          </h2>
                          <div className='h-96'>
                            <MatchChart match={currentMatch} />
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  <LevelResultsSection match={currentMatch} />
                  {currentMatch.state === MultiplayerMatchState.ACTIVE && currentMatch.timeUntilStart > 0 && (
                    <CountdownDisplay countDown={countDown} match={currentMatch} />
                  )}
                </div>
              </div>

            </div>
          ) : (
            <>
              <div className={classNames('flex flex-col items-center gap-2 w-full', {
                'py-8 mb-4': !(matchInProgress && iAmPlaying),
                'justify-start mb-4': matchInProgress && iAmPlaying
              })}>

                  {/* Chat for lobby and spectators during match */}
                  <div className='flex flex-col md:flex-row h-full items-center gap-4'>
                  {user && (!matchInProgress || currentIsSpectating) && (
                    <MatchChat
                      match={currentMatch}
                      user={user}
                      onSendMessage={sendChatMessage}
                      showSpectatorNotice={matchInProgress && currentIsSpectating}
                      connectedUsersCount={connectedPlayersInRoom?.count}
                    />
                  )}
                  <div className='flex flex-col gap-2 items-center'>
                  <MarkReadyButton match={currentMatch} user={user} onMarkReady={fetchMarkReady} onUnmarkReady={fetchUnmarkReady} />
                  <ReadyStatus match={currentMatch} user={user} />

                  {/* Invite Panel - Only show for match creator when match is OPEN and has only 1 player */}
                  {currentMatch.state === MultiplayerMatchState.OPEN &&
                   currentMatch.players.length === 1 &&
                   currentMatch.createdBy._id.toString() === user._id.toString() && (
                    <div className='flex flex-col gap-2 items-center mt-4 animate-fadeInUp' style={{ animationDelay: '0.5s' }}>
                      {!showInvitePanel ? (
                        <button
                          onClick={() => setShowInvitePanel(true)}
                          className='group relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 flex items-center gap-2'
                        >
                          <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-700' />
                          <svg className='w-4 h-4 relative z-10' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
                          </svg>
                          <span className='relative z-10'>Invite Player</span>
                        </button>
                      ) : (
                        <div className='flex flex-col gap-2 items-center bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20'>
                          <h3 className='text-sm font-medium'>Invite a player</h3>
                          <div className='w-64'>
                            <MultiSelectUser
                              placeholder='Search for a player...'
                              onSelect={handleInviteUser}
                            />
                          </div>
                          <div className='flex gap-2'>
                            <button
                              onClick={() => setShowInvitePanel(false)}
                              disabled={isInviting}
                              className='px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors disabled:opacity-50'
                            >
                              Cancel
                            </button>
                          </div>
                          {isInviting && (
                            <div className='text-xs text-gray-300'>Sending invitation...</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  </div>
                  </div>
                <div className='flex flex-col xl:flex-row items-start justify-center gap-6 w-full max-w-6xl'>
                  <div className='flex flex-col items-center gap-6 w-full xl:w-auto'>
                    <div className='flex flex-col  h-full items-center gap-4'>
<div className='flex flex-col gap-2' />
                    </div>
                    <div className='w-full max-w-4xl mx-auto animate-fadeInUp' style={{ animationDelay: '0.6s' }}>
                      <MatchStatus
                        isMatchPage={true}
                        match={currentMatch}
                        onLeaveClick={() => {
                          //router.reload();
                        }}
                      />
                      <CountdownDisplay countDown={countDown} match={currentMatch} />
                    </div>
                  </div>

                </div>

              </div>

              {activeLevel && (
                <div className={matchInProgress && iAmPlaying ? 'flex-1' : ''}>
                  <MatchGameplay
                    activeLevel={activeLevel}
                    matchId={currentMatch.matchId}
                    usedSkip={usedSkip}
                    onMove={(gameState) => {
                      const matchGameState: MatchGameState = { ...gameState, leastMoves: activeLevel.leastMoves };

                      latestMatchGameStateRef.current = matchGameState;
                      emitMatchState(matchGameState);
                    }}
                    onSkipUsed={() => setUsedSkip(true)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </SpaceBackground>
    </Page>
  );
}
