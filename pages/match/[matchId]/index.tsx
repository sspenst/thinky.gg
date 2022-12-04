import moment from 'moment';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import FormattedUser from '../../../components/formattedUser';
import Game from '../../../components/level/game';
import MatchStatus from '../../../components/matchStatus';
import Page from '../../../components/page';
import SelectCard from '../../../components/selectCard';
import SkeletonPage from '../../../components/skeletonPage';
import Dimensions from '../../../constants/dimensions';
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
        <div data-tooltip={'Skipped'} className='qtip rounded-full bg-blue-500 border' style={{
          borderColor: 'var(--bg-color-4)',
        }}>
          <svg xmlns='http://www.w3.org/2000/svg' fill='currentColor' className='w-6 h-6 bi bi-arrow-right-short' viewBox='0 0 16 16'>
            <path fillRule='evenodd' d='M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8z' />
          </svg>
        </div>
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
      <div className='text-xs w-8 justify-center flex'>
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
        <div className='flex flex-col gap-2 justify-left'>
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

  return (
    <Page
      isFullScreen={match.state === MultiplayerMatchState.ACTIVE}
      title='Multiplayer Match'
    >
      {match.state === MultiplayerMatchState.FINISHED ? (
        <div className='flex flex-col items-center justify-center p-3 gap-6'>
          <div className='text-3xl font-bold text-center'>
            Match Finished
          </div>
          <button
            className='px-4 py-2 text-lg font-bold text-white bg-blue-500 rounded-md hover:bg-blue-600'
            onClick={() => router.push('/multiplayer')}
          >
            Continue
          </button>
          <MatchStatus match={match} recap={match.matchLog?.find(log => log.type === MatchAction.GAME_RECAP)?.data as MatchLogDataGameRecap} />
          <div className='flex flex-col justify-center gap-2'>
            {levelResults}
          </div>
        </div>
      ) : (
        <div className='flex flex-col items-center justify-center h-full gap-1'>
          {countDown > 0 && <h1 className='text-xl italic'>Starting in {timeUntilEndCleanStr} seconds</h1>}
          <div className='pt-2'>
            <MatchStatus
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
