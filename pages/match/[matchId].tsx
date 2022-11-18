import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import MultiplayerMatchLobbyItem from '../../components/multiplayerMatchLobbyItem';
import Page from '../../components/page';
import useMatch from '../../hooks/useMatch';
import { getUserFromToken } from '../../lib/withAuth';
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

    const ts = Date.now() + match.timeUntilStart;

    setTimestart(ts > 0 ? ts : 0);
  }, [match, router]);

  if (!match) {
    return <div>Cannot find match</div>;
  }

  return (
    <Page title='Multiplayer Match'>
      <div className='flex flex-col items-center justify-center p-3'>
        <h1 className='text-4xl font-bold'>Match</h1>

        <h1>Match Game</h1>

        {match.timeUntilStart > 0 ? (
          <h2>Starts in {(( timestart - Date.now()) / 1000) >> 0} seconds</h2>
        ) : (
          <h2>Game is starting!</h2>
        )}

        <MultiplayerMatchLobbyItem match={match}
          onJoinClick={() => {
            console.log('joining');
          }}
          onLeaveClick={() => {
            console.log('leaving');
          }}
        />
      </div>
    </Page>
  );
}
