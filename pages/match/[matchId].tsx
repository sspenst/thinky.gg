import classNames from 'classnames';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Game from '../../components/level/game';
import MultiplayerMatchLobbyItem from '../../components/multiplayerMatchLobbyItem';
import MultiplayerMatchScoreboard from '../../components/multiplayerMatchScoreboard';
import Page from '../../components/page';
import useMatch from '../../hooks/useMatch';
import { getUserFromToken } from '../../lib/withAuth';
import Level from '../../models/db/level';
import { ReqUser } from '../../models/db/user';
import { MultiplayerMatchState } from '../../models/MultiplayerEnums';

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

  if (!match) {
    return <div>Cannot find match</div>;
  }

  const timeCountDownClean = ((timestart - Date.now()) / 1000) >> 0;

  return (
    <Page
      title='Multiplayer Match'
      isFullScreen={true}
    >
      <div className='flex flex-col items-center justify-center p-3 h-full'>

        {timeCountDownClean > 0 &&
        <>
          <h1 className='text-4xl font-bold'>Match</h1>
          <h2>Starts in {timeCountDownClean} seconds</h2>
        </>

        }
        {activeLevel && (
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
        )}

        {!activeLevel ? (
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
        )}

      </div>

    </Page>
  );
}
