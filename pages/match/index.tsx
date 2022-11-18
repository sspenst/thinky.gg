import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React, { useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import MultiplayerMatchLobbyItem from '../../components/multiplayerMatchLobbyItem';
import Page from '../../components/page';
import useMatches from '../../hooks/useMatches';
import useUser from '../../hooks/useUser';
import { getUserFromToken } from '../../lib/withAuth';
import MultiplayerMatch from '../../models/db/multiplayerMatch';
import User, { ReqUser } from '../../models/db/user';

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
    props: {
    },
  };
}

export default function Match() {
  const { matches, mutateMatches } = useMatches();
  const { user } = useUser();

  useEffect(() => {
    if (!matches) {return;}

    for (const match of matches) {
      // if match.players includes user, then redirect to match page /match/[matchId]

      if (match.players.length > 1 && match.players.some((player: User) => player?._id?.toString() === user?._id?.toString())) {
        window.location.href = `/match/${match.matchId}`;

        return;
      }
    }
  }
  , [matches, user]);

  const btnCreateMatchClick = async () => {
    toast.dismiss();
    toast.loading('Creating Match...');
    const res = await fetch('/api/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'test',
      }),
      credentials: 'include',
    });
    const data = await res.json();

    if (!res.ok) {
      toast.dismiss();
      toast.error(data.error || 'Failed to create match');
    } else {
      toast.dismiss();
      toast.success('Created Match');
    }

    mutateMatches();
  };

  return (
    <Page title='Multiplayer Match'>
      <div className='flex flex-col items-center justify-center p-3'>
        <h1 className='text-4xl font-bold'>Lobby</h1>
        <p>Play against other Pathology players in a realtime multiplayer match</p>
        <div id='create_button_section' className='p-3'>
          <button
            onClick={btnCreateMatchClick}
            className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'>
                Create Match
          </button>
        </div>

        <div id='match_list_section' className='flex flex-col items-center justify-center p-3'>
          <h2 className='text-2xl font-bold'>Select a game</h2>
          <p>Join a match in progress</p>
          {matches?.map((match: MultiplayerMatch) => (
            <MultiplayerMatchLobbyItem key={match._id.toString()} match={match} onJoinClick={() => mutateMatches()} onLeaveClick={() => {mutateMatches;}} />
          ))}

        </div>

      </div>
    </Page>
  );
}
