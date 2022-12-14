import { DefaultEventsMap } from '@socket.io/component-emitter';
import classNames from 'classnames';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import io, { Socket } from 'socket.io-client';
import FormattedUser from '../../components/formattedUser';
import MatchStatus, { getMatchCountFromProfile, getProfileRatingDisplay, getRatingFromProfile } from '../../components/matchStatus';
import CreateMatchModal from '../../components/modal/createMatchModal';
import Page from '../../components/page';
import { isProvisional, MUTLIPLAYER_PROVISIONAL_GAME_LIMIT } from '../../helpers/multiplayerHelperFunctions';
import sortByRating from '../../helpers/sortByRating';
import useUser from '../../hooks/useUser';
import { getUserFromToken } from '../../lib/withAuth';
import MultiplayerMatch from '../../models/db/multiplayerMatch';
import User, { UserWithMultiplayerProfile } from '../../models/db/user';
import { MultiplayerMatchState, MultiplayerMatchType } from '../../models/MultiplayerEnums';

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
  const [connectedPlayers, setConnectedPlayers] = useState<UserWithMultiplayerProfile[]>([]);
  const [connectedPlayersCount, setConnectPlayersCount] = useState(0);
  const [matches, setMatches] = useState<MultiplayerMatch[]>([]);
  const [privateAndInvitedMatches, setPrivateAndInvitedMatches] = useState<MultiplayerMatch[]>([]);
  const router = useRouter();
  const [socket, setSocket] = useState<Socket<DefaultEventsMap, DefaultEventsMap>>();
  const { user } = useUser();
  const [isCreateMatchModalOpen, setIsCreateMatchModalOpen] = useState(false);

  useEffect(() => {
    const socketConn = io('', {
      path: '/api/socket/',
      withCredentials: true
    });

    socketConn.on('privateAndInvitedMatches', (matches: MultiplayerMatch[]) => {
      setPrivateAndInvitedMatches(matches);
    });
    socketConn.on('matches', (matches: MultiplayerMatch[]) => {
      setMatches(matches);
    });
    socketConn.on('connectedPlayers', (connectedPlayers: {users: UserWithMultiplayerProfile[], count: number}) => {
      setConnectedPlayers(connectedPlayers.users);
      setConnectPlayersCount(connectedPlayers.count);
    });
    setSocket(socketConn);

    return () => {
      socketConn.off('matches');
      socketConn.off('connectedPlayers');
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

    for (const match of privateAndInvitedMatches) {
      // if match is active and includes user, then redirect to match page /match/[matchId]
      if (match.state === MultiplayerMatchState.ACTIVE && match.players.some((player: User) => player?._id?.toString() === user?._id?.toString())) {
        router.push(`/match/${match.matchId}`);

        return;
      }
    }
  }, [matches, privateAndInvitedMatches, router, user]);
  const postNewMatch = useCallback(async (matchType: MultiplayerMatchType, isPrivate: boolean, isRated: boolean) => {
    toast.dismiss();
    toast.loading('Creating Match...');

    fetch('/api/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        private: isPrivate,
        rated: isRated,
        type: matchType
      }),
      credentials: 'include',
    }).then(async (res) => {
      if (!res.ok) {
        throw res.text();
      }

      toast.dismiss();
      toast.success('Created Match');
      const createdMatch = await res.json() as MultiplayerMatch;

      if (createdMatch.private) {
        router.push(`/match/${createdMatch.matchId}`);
      }
    }).catch(async err => {
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error || 'Failed to create match');
    });
  }, [router]);
  const btnCreateMatchClick = useCallback(async () => {
    setIsCreateMatchModalOpen(true);
  }, []);

  const openMatches = [...privateAndInvitedMatches.filter(match => match.state === MultiplayerMatchState.OPEN)];
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
            <span>{socket?.connected ? `${connectedPlayersCount} player${connectedPlayersCount !== 1 ? 's' : ''} connected` : 'Connecting...'}</span>
          </div>
          <div>Play against other Pathology players in a realtime multiplayer match:</div>
          <ul>
            <li>Complete as many levels as you can in 3 minutes</li>
            <li>Levels get progressively harder</li>
            <li>You are allowed to skip one level during the match</li>
          </ul>
          {user && <>
            <div className='font-bold italic text-xl'>
            Your rating:
            </div>
            <div className='py-0.5 px-2.5 -mt-2 border rounded flex items-center gap-2' style={{
              borderColor: 'var(--bg-color-3)',
            }}>
              {getProfileRatingDisplay(MultiplayerMatchType.RushBullet, user.multiplayerProfile)}
              {getProfileRatingDisplay(MultiplayerMatchType.RushBlitz, user.multiplayerProfile)}
              {getProfileRatingDisplay(MultiplayerMatchType.RushRapid, user.multiplayerProfile)}
              {getProfileRatingDisplay(MultiplayerMatchType.RushClassical, user.multiplayerProfile)}
            </div>
          </>}
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

          <div className='flex flex-wrap justify-center gap-4 mx-4'>
            <div className='flex flex-col gap-4'>
              <h2 className='text-2xl font-bold flex justify-center'>Currently connected</h2>
              <div className='flex flex-col gap-2'>
                {connectedPlayers.map(player => (
                  <div key={'multiplayer-' + player._id.toString()} className='flex items-center gap-2'>
                    <FormattedUser user={player} />
                    {getProfileRatingDisplay(MultiplayerMatchType.RushBullet, player.multiplayerProfile)}
                    {getProfileRatingDisplay(MultiplayerMatchType.RushBlitz, player.multiplayerProfile)}
                    {getProfileRatingDisplay(MultiplayerMatchType.RushRapid, player.multiplayerProfile)}
                    {getProfileRatingDisplay(MultiplayerMatchType.RushClassical, player.multiplayerProfile)}
                  </div>
                ))}
              </div>
            </div>
            <div className='flex flex-col gap-2'>
              <h2 className='text-2xl font-bold mb-2 flex justify-center'>Open matches</h2>
              {openMatches.length === 0 && <span className='italic flex justify-center'>No open matches!</span>}
              {openMatches.sort((a, b) => sortByRating(a.players[0], b.players[0], MultiplayerMatchType.RushBullet)).map((match: MultiplayerMatch) => (
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
        </div>
        <CreateMatchModal
          isOpen={isCreateMatchModalOpen}
          closeModal={() => setIsCreateMatchModalOpen(false) }
          onConfirm={(matchType: MultiplayerMatchType, isPrivate: boolean, isRated: boolean) => {
            setIsCreateMatchModalOpen(false);
            postNewMatch(matchType, isPrivate, isRated);
          }}
        />
      </>
    </Page>
  );
}
