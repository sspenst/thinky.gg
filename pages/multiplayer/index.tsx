import { DefaultEventsMap } from '@socket.io/component-emitter';
import classNames from 'classnames';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import io, { Socket } from 'socket.io-client';
import MatchStatus from '../../components/matchStatus';
import Page from '../../components/page';
import { isProvisional, MUTLIPLAYER_PROVISIONAL_GAME_LIMIT } from '../../helpers/multiplayerHelperFunctions';
import useUser from '../../hooks/useUser';
import { getUserFromToken } from '../../lib/withAuth';
import MultiplayerMatch from '../../models/db/multiplayerMatch';
import User from '../../models/db/user';
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

  return {
    props: {},
  };
}

/* istanbul ignore next */
export default function Multiplayer() {
  const [matches, setMatches] = useState<MultiplayerMatch[]>([]);
  const router = useRouter();
  const [socket, setSocket] = useState<Socket<DefaultEventsMap, DefaultEventsMap>>();
  const { user } = useUser();

  useEffect(() => {
    const socketConn = io('', {
      path: '/api/socket/',
      withCredentials: true
    });

    socketConn.on('matches', (matches: MultiplayerMatch[]) => {
      setMatches(matches);
    });
    socketConn.on('disconnect', () => {
      toast.dismiss();
      toast.loading('Reconnecting...');
    });
    setSocket(socketConn);

    return () => {
      socketConn.off('matches');
      socketConn.disconnect();
    };
  }, []);

  useEffect(() => {
    for (const match of matches) {
      // if match is active and includes user, then redirect to match page /match/[matchId]
      if (match.state === MultiplayerMatchState.ACTIVE && match.players.some((player: User) => player?._id?.toString() === user?._id?.toString())) {
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
  let hasCreatedMatch = false;

  for (const match of matches) {
    if (match.state === MultiplayerMatchState.OPEN) {
      openMatches.push(match);
    } else if (match.state === MultiplayerMatchState.ACTIVE) {
      activeMatches.push(match);
    }

    if (match.players.some(player => player._id.toString() === user?._id?.toString())) {
      hasCreatedMatch = true;
    }
  }

  return (
    <Page title='Multiplayer'>
      <>
        <NextSeo
          title={'Multiplayer - Pathology'}
          description={'Play Pathology in real time against other players'}
          canonical='https://pathology.gg/multiplayer'
        />
        <div className='flex flex-col items-center justify-center p-4 gap-4'>
          <h1 className='text-4xl font-bold'>Multiplayer</h1>
          <div className='text-sm italic text-center'>
          Disclaimer - Multiplayer is still in beta. Scores, ratings, and game history may be wiped.
          </div>
          <div className='py-0.5 px-2.5 border rounded flex items-center gap-2' style={{
            borderColor: 'var(--bg-color-3)',
          }}>
            {!socket?.connected && <span className='animate-ping absolute inline-flex rounded-full bg-yellow-500 opacity-75 h-2.5 w-2.5' />}
            <span className={classNames(socket?.connected ? 'bg-green-500' : 'bg-yellow-500', 'h-2.5 w-2.5 rounded-full')} />
            <span>{socket?.connected ? 'Connected' : 'Connecting...'}</span>
          </div>
          <div>Play against other Pathology players in a realtime multiplayer match:</div>
          <ul>
            <li>Complete as many levels as you can in 3 minutes</li>
            <li>Levels get progressively harder</li>
            <li>You are allowed to skip one level during the match</li>
          </ul>
          <div className='font-bold italic text-xl'>
          Your rating:
          </div>
          <div className='py-0.5 px-2.5 -mt-2 border rounded flex items-center gap-2' style={{
            borderColor: 'var(--bg-color-3)',
          }}>
            {isProvisional(user?.multiplayerProfile) ?
              <div>
                {user?.multiplayerProfile?.calc_matches_count ?? MUTLIPLAYER_PROVISIONAL_GAME_LIMIT} match{user?.multiplayerProfile?.calc_matches_count === 1 ? '' : 'es'} remaining!
              </div>
              :
              <div>
                {Math.round(user?.multiplayerProfile?.rating ?? 1000)}
              </div>
            }
          </div>
          {!hasCreatedMatch &&
          <div id='create_button_section' className=''>
            <button
              className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
              onClick={btnCreateMatchClick}
            >
              Create Match
            </button>
          </div>
          }
          <div className='flex flex-col gap-2'>
            <h2 className='text-2xl font-bold mb-2 flex justify-center'>Open matches</h2>
            {openMatches.length === 0 && <span className='italic flex justify-center'>No open matches!</span>}
            {openMatches.map((match: MultiplayerMatch) => (
              <MatchStatus key={match._id.toString()} match={match} />
            ))}
          </div>
          <div className='flex flex-col gap-2'>
            <h2 className='text-2xl font-bold mb-2 flex justify-center'>Active matches</h2>
            {activeMatches.length === 0 && <span className='italic flex justify-center'>No active matches!</span>}
            {activeMatches.map((match: MultiplayerMatch) => (
              <MatchStatus key={match._id.toString()} match={match} />
            ))}
          </div>
        </div>
      </>
    </Page>
  );
}
