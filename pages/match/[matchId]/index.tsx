import Grid from '@root/components/level/grid';
import MatchResults from '@root/components/matchResults';
import { GameState } from '@root/helpers/gameStateHelpers';
import { UserWithMultiplayerProfile } from '@root/models/db/user';
import moment from 'moment';
import { Types } from 'mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import FormattedUser from '../../../components/formattedUser';
import Game from '../../../components/level/game';
import MatchChart from '../../../components/matchChart';
import MatchStatus from '../../../components/matchStatus';
import Page from '../../../components/page';
import SelectCard from '../../../components/selectCard';
import SkeletonPage from '../../../components/skeletonPage';
import StyledTooltip from '../../../components/styledTooltip';
import Dimensions from '../../../constants/dimensions';
import { AppContext } from '../../../contexts/appContext';
import { getUserFromToken } from '../../../lib/withAuth';
import Control from '../../../models/control';
import Level from '../../../models/db/level';
import MultiplayerMatch from '../../../models/db/multiplayerMatch';
import { MatchAction, MatchLogDataGameRecap, MatchLogDataLevelComplete, MultiplayerMatchState } from '../../../models/MultiplayerEnums';
import SelectOption from '../../../models/selectOption';

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

  return {
    props: {},
  };
}

/* istanbul ignore next */
export default function Match() {
  const [match, setMatch] = useState<MultiplayerMatch>();
  const [connectedPlayersInRoom, setConnectedPlayersInRoom] = useState<{count: number, users: UserWithMultiplayerProfile[]}>();
  const readyMark = useRef(false);
  const router = useRouter();
  const startSoundPlayed = useRef(false);
  const { sounds, user, multiplayerSocket } = useContext(AppContext);
  const [usedSkip, setUsedSkip] = useState<boolean>(false);
  const { matchId } = router.query as { matchId: string };
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [player1GameState, setPlayer1GameState] = useState<GameState | null>(null);
  const [player2GameState, setPlayer2GameState] = useState<GameState | null>(null);
  const notPlaying = !match?.players.some(player => player._id.toString() === user?._id.toString());
  const player1 = match?.players[0]._id.toString();

  function emitGameState(gameState: GameState) {
    multiplayerSocket?.socket?.emit('gameState', {
      matchId: match?.matchId,
      gameState: gameState,
    });
  }

  useEffect(() => {
    console.log('connecting to socket');
    const socketConn = io('', {
      path: '/api/socket/',
      withCredentials: true,
      query: {
        matchId: matchId,
      }
    });

    if (notPlaying) {
      socketConn.on('gameState', (data: { userId: string, gameState: GameState }) => {
        const { userId: userIdString, gameState } = data;

        console.log('gameState', userIdString, player1);

        if (userIdString === player1) {
          setPlayer1GameState(gameState);
        } else {
          setPlayer2GameState(gameState);
        }
      }
      );
    }

    socketConn.on('connectedPlayersInRoom', (players: {count: number, users: UserWithMultiplayerProfile[]}) => {
      setConnectedPlayersInRoom(players);
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
      socketConn.off('gameState');
      socketConn.disconnect();
    };
  }, [matchId, notPlaying, player1, router]);

  const [countDown, setCountDown] = useState<number>(-1);

  const btnSkip = useCallback(async() => {
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
          levelId: activeLevel?._id.toString(),
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

  useEffect(() => {
    // if no match or url is already multiplayer
    if (!match) {
      return;
    }

    if (match.levels.length > 0) {
      setActiveLevel((match.levels as Level[])[0]);
    }
  }, [match, router]);
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
    return <SkeletonPage />;
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
          {`+${moment(timestamp).format('m:ss')}`}
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
          {`+${moment(timestamp).format('m:ss')}`}
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

    levelResults.push(
      <div className='flex justify-center items-center flex-wrap' key={`level-result-${level._id.toString()}`}>
        <div className='flex flex-row items-center'>
          <div className='text-2xl font-bold w-10 text-right'>
            {i + 1}.
          </div>
          <SelectCard
            option={{
              author: level.userId?.name,
              hideDifficulty: false,
              height: Dimensions.OptionHeightLarge,
              href: `/level/${level.slug}`,
              id: level._id.toString(),
              level: level,
              text: level.name,
            } as SelectOption}
          />
        </div>
        <div className='flex flex-col gap-2 justify-left truncate'>
          {match.players.map(player => (
            <div className='flex flex-row gap-2 items-center' key={player._id.toString()}>
              {getLevelResultIcon(level, player._id.toString())}
              <FormattedUser size={Dimensions.AvatarSizeSmall} user={player} />
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

  return (
    <Page
      isFullScreen={match.state === MultiplayerMatchState.ACTIVE && match.players.some(player => player._id.toString() === user?._id.toString())}
      title='Multiplayer Match'
    >
      <>
        <h1 className={'text-3xl font-bold text-center p-3 ' + (match.state === MultiplayerMatchState.ACTIVE && match.timeUntilStart <= 0 ? 'hidden' : '')}>
          {
            ({
              [MultiplayerMatchState.OPEN]: 'Match Open',
              [MultiplayerMatchState.FINISHED]: 'Match Finished',
              [MultiplayerMatchState.ACTIVE]: 'Match about to begin',
              [MultiplayerMatchState.ABORTED]: 'Match Aborted',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)[match.state]
          }
        </h1>
        {connectedPlayersInRoom && connectedPlayersInRoom.count > 2 && (
          <div className=' absolute items-center justify-center p-1'>
            <div
              className='-ml-1 px-0.5 text-xs rounded-full text-green-500'
              style={{
                backgroundColor: 'var(--bg-color-2)',
                fontSize: '0.75rem',
                lineHeight: '0.75rem',
                borderColor: 'var(--bg-color-2)',
              }}
            >
              {connectedPlayersInRoom.count - 2} spectating
            </div>
          </div>
        )}
        {match.state === MultiplayerMatchState.FINISHED || match.state === MultiplayerMatchState.ABORTED || notPlaying ? (
          <div className='flex flex-col items-center justify-center p-3 gap-6'>
            <Link
              className='px-4 py-2 text-lg font-bold text-white bg-blue-500 rounded-md hover:bg-blue-600'
              href='/multiplayer'
            >
              Back
            </Link>
            <MatchResults match={match} recap={match.matchLog?.find(log => log.type === MatchAction.GAME_RECAP)?.data as MatchLogDataGameRecap} showViewLink={false} />
            {player1GameState && player2GameState &&
            (
              <div className='flex flex-row gap-2 h-48 w-full'>

                <div className='flex flex-col h-48 w-full '>
                  <FormattedUser size={Dimensions.AvatarSizeSmall} user={match.players[0]} />
                  <Grid id='player1' gameState={player1GameState} leastMoves={player1GameState.leastMoves || 0} onCellClick={() => {console.log('click');}} />

                </div>

                <div className='flex flex-col h-48 w-full '>

                  <FormattedUser size={Dimensions.AvatarSizeSmall} user={match.players[1]} />

                  <Grid id='player1' gameState={player2GameState} leastMoves={player2GameState.leastMoves || 0} onCellClick={() => {console.log('click');}} />

                </div>
              </div>
            )}
            <div className='w-full max-w-screen-lg h-96'>
              <MatchChart match={match} />
            </div>
            <div className='flex flex-col justify-center gap-2 max-w-full'>
              {levelResults.reverse()}
            </div>
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center h-full gap-0.5'>
            {countDown > 0 && <h1 className='text-xl italic'>Starting in {timeUntilEndCleanStr} seconds</h1>}
            {match.state === MultiplayerMatchState.ACTIVE && match.timeUntilStart > 0 && (
              <div className='flex flex-col items-center justify-center gap-2'>
                {match.markedReady.length == 2 && <div>Both players ready!</div>}
                {match.markedReady.length === 0 && user && !(match.markedReady as Types.ObjectId[]).includes(user._id) && <div>Not ready</div>}
                {match.markedReady.length === 1 && user && !(match.markedReady as Types.ObjectId[]).includes(user._id) && <div>Other player is ready!</div>}
                {match.markedReady.length !== 2 && user && (match.markedReady as Types.ObjectId[]).includes(user._id) && <div>Waiting on other player</div>}
              </div>
            )}
            {match.state === MultiplayerMatchState.ACTIVE && match.timeUntilStart > 0 && user && !(match.markedReady as Types.ObjectId[]).includes(user._id) && (
              <button className='px-4 py-2 text-lg font-bold text-white bg-blue-500 rounded-md hover:bg-blue-600' onClick={(e: React.MouseEvent) => {
              // gray out this button and prevent click
                const targetButton = e.currentTarget as HTMLButtonElement;

                targetButton.disabled = true;
                targetButton.classList.add('opacity-50');
                // change the text to marking
                targetButton.innerText = 'Marking...';

                fetchMarkReady();
              }}>Mark Ready</button>
            )}
            <div className='pt-1 px-1 max-w-full'>
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
                <Game
                  allowFreeUndo={true}
                  disableCheckpoints={true}
                  enableSessionCheckpoint={false}
                  extraControls={[skipControl(usedSkip)]}
                  hideSidebar={true}
                  key={'game-' + activeLevel._id.toString()}
                  level={activeLevel}
                  matchId={match.matchId}
                  onMove={(gameState) => {
                    // sent the move to the server using socket
                    gameState.leastMoves = activeLevel.leastMoves;
                    emitGameState(gameState);
                  }
                  }
                />
              </div>
            )}
          </div>
        )}
      </>
    </Page>
  );
}
