import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import io from 'socket.io-client';
import MultiplayerMatchLobbyItem from '../../components/multiplayerMatchLobbyItem';
import Page from '../../components/page';
import useUser from '../../hooks/useUser';
import { getUserFromToken } from '../../lib/withAuth';
import MultiplayerMatch from '../../models/db/multiplayerMatch';
import User from '../../models/db/user';

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

/* istanbul ignore next */
export default function Match() {
  const [matches, setMatches] = useState<MultiplayerMatch[]>([]);
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    const socketConn = io('', {
      path: '/api/socket/',
      withCredentials: true
    });

    socketConn.on('disconnect', () => {
      toast.dismiss();
      toast.loading('Disconnected... Trying to reconnect...');
    });
    socketConn.on('matches', (matches: MultiplayerMatch[]) => {
      setMatches(matches);
    });

    return () => {
      socketConn.off('disconnect');
      socketConn.off('matches');
      socketConn.disconnect();
    };
  }, []);

  useEffect(() => {
    for (const match of matches) {
      // if match.players includes user, then redirect to match page /match/[matchId]
      if (match.players.length > 1 && match.players.some((player: User) => player?._id?.toString() === user?._id?.toString())) {
        router.push(`/match/${match.matchId}`);

        return;
      }
    }
  }, [matches, router, user]);

  const btnCreateMatchClick = async () => {
    toast.dismiss();
    toast.loading('Creating Match...');

    fetch('/api/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'test',
      }),
      credentials: 'include',
    }).then(res => {
      if (!res.ok) {
        throw res.text();
      }

      toast.dismiss();
      toast.success('Created Match');
    }).catch(async err => {
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error || 'Failed to create match');
    });
  };

  const openMatches = [];
  const activeMatches = [];

  for (const match of matches) {
    if (match.players.length <= 1) {
      openMatches.push(match);
    } else {
      activeMatches.push(match);
    }
  }

  return (
    <Page title='Multiplayer'>
      <div className='flex flex-col items-center justify-center p-3'>
        <h1 className='text-4xl font-bold'>Multiplayer</h1>
        <p className='p-3'>Play against other Pathology players in a realtime multiplayer match:</p>
        <ul>
          <li>Complete as many levels as you can in 3 minutes</li>
          <li>Levels get progressively harder</li>
          <li>You are allowed to skip one level during the match</li>
        </ul>
        <div id='create_button_section' className='p-6'>
          <button
            onClick={btnCreateMatchClick}
            className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'>
                Create Match
          </button>
        </div>
        <div className='mb-4 flex flex-col gap-2'>
          <h2 className='text-2xl font-bold mb-2 flex justify-center'>Open matches</h2>
          {openMatches.length === 0 && <span className='italic flex justify-center'>No open matches!</span>}
          {openMatches.map((match: MultiplayerMatch) => (
            <MultiplayerMatchLobbyItem key={match._id.toString()} match={match} />
          ))}
        </div>
        <div className='flex flex-col gap-2'>
          <h2 className='text-2xl font-bold mb-2 flex justify-center'>Active matches</h2>
          {activeMatches.length === 0 && <span className='italic flex justify-center'>No active matches!</span>}
          {activeMatches.map((match: MultiplayerMatch) => (
            <MultiplayerMatchLobbyItem key={match._id.toString()} match={match} />
          ))}
        </div>
      </div>
    </Page>
  );
}
