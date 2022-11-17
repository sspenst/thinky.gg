import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import React from 'react';
import { toast } from 'react-hot-toast';
import MultiplayerMatchLobbyItem from '../../components/multiplayerMatchLobbyItem';
import Page from '../../components/page';
import SkeletonPage from '../../components/skeletonPage';
import useMatch from '../../hooks/useMatch';
import { getUserFromToken } from '../../lib/withAuth';
import MultiplayerMatch from '../../models/db/multiplayerMatch';
import { ReqUser } from '../../models/db/user';
import { MultiplayerMatchModel } from '../../models/mongoose';
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
  // use router
  const router = useRouter();

  if (!match) {
    return <div>Cannot find match</div>;
  }

  if (match.state === MultiplayerMatchState.ABORTED) {
    toast.error('Match has been aborted');
    // redirect user
    router.push('/match');
  }

  return (
    <Page title='Multiplayer Match'>
      <div className='flex flex-col items-center justify-center p-3'>
        <h1 className='text-4xl font-bold'>Match</h1>

        <h1>Match Game</h1>
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
