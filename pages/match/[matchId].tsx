import moment from 'moment';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import EnrichedLevelLink from '../../components/enrichedLevelLink';
import FormattedUser from '../../components/formattedUser';
import Game from '../../components/level/game';
import MultiplayerMatchLobbyItem from '../../components/multiplayerMatchLobbyItem';
import MultiplayerMatchScoreboard from '../../components/multiplayerMatchScoreboard';
import Page from '../../components/page';
import useMatch from '../../hooks/useMatch';
import { getUserFromToken } from '../../lib/withAuth';
import Level, { EnrichedLevel } from '../../models/db/level';
import User, { ReqUser } from '../../models/db/user';
import { MatchAction, MatchLog, MultiplayerMatchState } from '../../models/MultiplayerEnums';

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

  const { matchId } = context.query;

  return {
    props: {
      matchId: matchId,
    },
  };
}

export default function MatchGame({ matchId }: {user: ReqUser, matchId: string}) {
  const { match } = useMatch(matchId);
  const [activeLevel, setActiveLevel] = React.useState<Level | null>(null);
  const [timestart, setTimestart] = React.useState<number>(Date.now());
  const router = useRouter();

  useEffect(() => {
    if (!match) {return;}

    if (match.state === MultiplayerMatchState.ABORTED) {
      toast.error('Match has been aborted');
      // redirect user
      router.push('/match');

      return;
    }

    if (match.levels.length > 0) {
      setActiveLevel(match.levels[0]);
    }

    const ts = Date.now() + match.timeUntilStart;

    setTimestart(ts > 0 ? ts : 0);
  }, [match, router]);
  useEffect(() => {
    // check if match already has a GAME_START log
    for (const log of match?.matchLog || []) {
      if (log.action === MatchAction.GAME_START) {
        return;
      }
    }

    match?.matchLog?.push({
      type: MatchAction.GAME_START,
      createdAt: match.startTime,
      data: {}
    });
    match?.matchLog?.push({
      type: MatchAction.GAME_END,
      createdAt: match.endTime,
      data: {}
    });
    match?.matchLog?.sort((a, b) => a.createdAt - b.createdAt);
  }, [match]);

  if (!match) {
    return <div>Cannot find match</div>;
  }

  const timeCountDownClean = ((timestart - Date.now()) / 1000) >> 0;
  const playerMap = new Map<string, User>();

  for (const player of match.players) {
    playerMap.set(player._id.toString(), player);
  }

  const parseRules = {
    [MatchAction.CREATE]: () => <><span className='flex-1'></span><span className='self-center'>Match created</span></>,
    [MatchAction.GAME_START]: () => <><span className='flex-1'></span><span className='self-center'>Match started</span></>,
    [MatchAction.GAME_END]: () => <><span className='flex-1'></span><span className='self-center'>Match ended</span></>,
    [MatchAction.JOIN]: (ref: MatchLog) => <><span></span><FormattedUser user={ref.data.userId as User} /><span className='self-center'>joined the match</span></>,
    [MatchAction.QUIT]: (ref: MatchLog) => <><FormattedUser user={ref.data.userId as User} /><span className='self-center'>quit the match</span></>,
    [MatchAction.COMPLETE_LEVEL]: (ref: MatchLog) => <><FormattedUser user={ref.data.userId as User} /><span className='self-center'>completed level</span><EnrichedLevelLink level={ref.data.levelId} /></>,
  };

  const matchLog = match.matchLog?.map((log: MatchLog, index: number) => {
    const date = log.createdAt;
    const logType = log.type;

    const logTypeDef = parseRules[logType as MatchAction] as (ref: MatchLog) => JSX.Element;
    const logParse = logTypeDef ? logTypeDef(log) : log;
    const logTranslated = <><div className='self-center'>{moment(date).format('MM-DD-YY h:mm:ss.SSa')} </div>{logParse}</>;

    return (<div key={'log-item' + index} className='flex flex-cols-3 gap-10'>{logTranslated}</div>);
  });

  const finishedState = (<div className='flex flex-col items-center justify-center w-full h-full'>
    <div className='text-2xl font-bold text-center'>Match Finished</div>
    <div className='text-2xl font-bold text-center'>Scoreboard</div>

    <MultiplayerMatchScoreboard match={match} />
    <button className='px-4 py-2 mt-4 text-lg font-bold text-white bg-blue-500 rounded-md hover:bg-blue-600' onClick={() => router.push('/match')}>Back to Lobby</button>
    <div className='flex flex-col gap-2 p-3 text-sm'>
      {matchLog}
    </div>
  </div>);

  const countdownComponent = timeCountDownClean > 0 && (
    <>
      <h1 className='text-4xl font-bold'>Match</h1>
      <h2>Starts in {timeCountDownClean} seconds</h2>
    </>);

  const gameComponent = activeLevel && (
    <div id='game-div-parent' key={'div-' + activeLevel._id.toString()} className='grow h-full w-full'
      style={{

      }}>

      <Game
        allowFreeUndo={true}
        enableLocalSessionRestore={true} // TODO: clear session before playing?
        //disableServer={true}
        matchId={match.matchId}
        key={'game-' + activeLevel._id.toString()}
        hideSidebar={true}
        level={activeLevel}

      />

    </div>
  );
  const bottomComponent = !activeLevel ? (
    <MultiplayerMatchLobbyItem match={match}
      onJoinClick={() => {
        console.log('joining');
      }}
      onLeaveClick={() => {
        console.log('leaving');
      }} />
  ) : (
    <MultiplayerMatchScoreboard match={match}
      onLeaveClick={() => {
        console.log('leaving');
      }} />
  );

  return (
    <Page
      title='Multiplayer Match'
      isFullScreen={true}
    >
      <div className='flex flex-col items-center justify-center p-3 h-full'>

        {match.state === MultiplayerMatchState.FINISHED ? (
          <> {finishedState }</>
        ) : (
          <>
            {countdownComponent}
            {gameComponent}
            {bottomComponent}
          </>
        )}

      </div>

    </Page>
  );
}
