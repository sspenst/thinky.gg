import moment from 'moment';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import EnrichedLevelLink from '../../../components/enrichedLevelLink';
import FormattedUser from '../../../components/formattedUser';
import Game from '../../../components/level/game';
import MatchStatus from '../../../components/matchStatus';
import Page from '../../../components/page';
import SkeletonPage from '../../../components/skeletonPage';
import { getUserFromToken } from '../../../lib/withAuth';
import Control from '../../../models/control';
import Level from '../../../models/db/level';
import MultiplayerMatch from '../../../models/db/multiplayerMatch';
import User from '../../../models/db/user';
import { MatchAction, MatchLog, MatchLogDataFromUser, MatchLogDataGameRecap, MatchLogDataLevelComplete, MultiplayerMatchState } from '../../../models/MultiplayerEnums';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    // redirect to login page
    return {
      redirect: {
        destination: '/login',
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
  const router = useRouter();
  const [usedSkip, setUsedSkip] = useState<boolean>(false);
  const { matchId } = router.query as { matchId: string };

  useEffect(() => {
    const socketConn = io('', {
      path: '/api/socket/',
      withCredentials: true,
      query: {
        matchId: matchId,
      }
    });

    socketConn.on('match', (match: MultiplayerMatch) => {
      setMatch(match);
    });

    return () => {
      socketConn.off('match');
      socketConn.disconnect();
    };
  }, [matchId]);

  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [countDown, setCountDown] = useState<number>(-1);

  const btnSkip = useCallback(async() => {
    // TODO: modal?
    if (confirm('Are you sure you want to skip this level? You only get one skip per Match.')) {
      toast.dismiss();
      toast.loading('Skipping level...');

      fetch(`/api/match/${matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: MatchAction.SKIP_LEVEL,
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
        toast.error(error || 'Failed to skip match');

        // if data.error contains 'already' then set usedSkip to true
        if (error?.toLowerCase().includes('already')) {
          setUsedSkip(true);
        }
      });
    }
  }, [matchId]);

  const skipControl = useCallback((disabled = false) => new Control(
    'control-skip',
    () => btnSkip(),
    <div className='flex justify-center'>
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
    if (!match) {
      return;
    }

    if (match.state === MultiplayerMatchState.ABORTED) {
      toast.error('Match has been aborted');
      router.push('/multiplayer');

      return;
    }

    if (match.state === MultiplayerMatchState.FINISHED) {
      toast.success('Match complete');
    }

    if (match.levels.length > 0) {
      setActiveLevel((match.levels as Level[])[0]);
    }
  }, [match, router]);

  useEffect(() => {
    if (!match) {
      return;
    }

    const drift = new Date(match.startTime).getTime() - match.timeUntilStart - Date.now();
    const iv = setInterval(() => {
      const cd = new Date(match.startTime).getTime() - Date.now();
      const ncd = (-drift + cd) / 1000;

      setCountDown(ncd > 0 ? ncd : 0); // TODO. verify this should be -drift not +drift...
    }, 250);

    return () => clearInterval(iv);
  }, [match]);

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

  match.matchLog = match.matchLog?.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const timeUntilEndCleanStr = `${Math.floor(countDown / 60)}:${((countDown % 60) >> 0).toString().padStart(2, '0')}`;

  const playerMap = new Map<string, User>();

  for (const player of match.players) {
    playerMap.set(player._id.toString(), player);
  }

  const parseRules = {
    [MatchAction.CREATE]: () => <><span className='self-center'>Match created</span></>,
    [MatchAction.GAME_START]: () => <><span className='self-center'>Match started</span></>,
    [MatchAction.GAME_END]: () => <><span className='self-center'>Match ended</span></>,
    [MatchAction.GAME_RECAP]: (ref: MatchLog) => {
      const data = ref.data as MatchLogDataGameRecap;

      return <><span>Ratings change</span><span>{(playerMap.get(data.winner?.userId) as User)?.name} ({data.winner?.rating}) {data.eloChangeWinner >= 0 ? '+' : ''}{data.eloChangeWinner.toFixed(1)}</span><span>{(playerMap.get(data.loser?.userId) as User)?.name} ({data.loser?.rating}) {-data.eloChangeLoser >= 0 ? '+' : ''}{-data.eloChangeLoser.toFixed(1)}</span></>;
    },
    [MatchAction.SKIP_LEVEL]: (ref: MatchLog) => {
      const data = ref.data as MatchLogDataFromUser;

      return <><span></span><FormattedUser user={playerMap.get(data.userId.toString()) as User} /><span className='self-center'>skipped a level</span></>;
    },
    [MatchAction.JOIN]: (ref: MatchLog) => {
      const data = ref.data as MatchLogDataFromUser;

      return <><span></span><FormattedUser user={playerMap.get(data.userId.toString()) as User} /><span className='self-center'>joined the match</span></>;
    },
    [MatchAction.QUIT]: (ref: MatchLog) => {
      const data = ref.data as MatchLogDataFromUser;

      return <><FormattedUser user={playerMap.get(data.userId.toString()) as User} /><span className='self-center'>quit the match</span></>;
    },
    [MatchAction.COMPLETE_LEVEL]: (ref: MatchLog) => {
      const data = ref.data as MatchLogDataLevelComplete;

      return <><FormattedUser user={playerMap.get(data.userId.toString()) as User} /><span className='self-center'>completed level</span><span className='self-center'><EnrichedLevelLink level={data.levelId as Level} /></span></>;
    },
  };

  const matchLog = match.matchLog?.map((log: MatchLog, index: number) => {
    const timestamp = new Date(log.createdAt).getTime() - new Date(match.startTime).getTime();
    const date = timestamp >= 0 ? '+' + moment(timestamp).format('mm:ss') : moment(log.createdAt).format('MM/DD/YY hh:mm:ssa');
    const logType = log.type;

    const logTypeDef = parseRules[logType as MatchAction] as (ref: MatchLog) => JSX.Element;
    const logParse = logTypeDef ? logTypeDef(log) : log;
    const logTranslated = <><div className='self-center'>{date} </div>{logParse}</>;

    return (<div key={'log-item' + index} className='grid grid-cols-4 gap-1'>{logTranslated}</div>);
  });

  return (
    <Page
      isFullScreen={match.state === MultiplayerMatchState.ACTIVE}
      title='Multiplayer Match'
    >
      {match.state === MultiplayerMatchState.FINISHED ? (
        <div className='flex flex-col items-center justify-center p-3 gap-4'>
          <div className='text-3xl font-bold text-center'>
            Match Finished
          </div>
          <MatchStatus match={match} />
          <button
            className='px-4 py-2 text-lg font-bold text-white bg-blue-500 rounded-md hover:bg-blue-600'
            onClick={() => router.push('/multiplayer')}
          >
            Back to Lobby
          </button>
          <div className='flex flex-col gap-2 text-xs p-3 h-full'>
            {matchLog}
          </div>
        </div>
      ) : (
        <div className='flex flex-col items-center justify-center h-full gap-1'>
          {countDown > 0 && <h1 className='text-xl italic'>Starting in {timeUntilEndCleanStr} seconds</h1>}
          <div className='pt-2'>
            <MatchStatus
              match={match}
              onLeaveClick={() => {
                router.push('/multiplayer');
              }}
            />
          </div>
          {activeLevel && (
            <div className='grow h-full w-full' key={'div-' + activeLevel._id.toString()}>
              <Game
                allowFreeUndo={true}
                enableLocalSessionRestore={false}
                extraControls={[skipControl(usedSkip)]}
                hideSidebar={true}
                key={'game-' + activeLevel._id.toString()}
                level={activeLevel}
                matchId={match.matchId}
              />
            </div>
          )}
        </div>
      )}
    </Page>
  );
}
