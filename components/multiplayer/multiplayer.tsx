import FormattedUser from '@root/components/formatted/formattedUser';
import CreateMatchModal from '@root/components/modal/createMatchModal';
import MatchStatus from '@root/components/multiplayer/matchStatus';
import SpaceBackground from '@root/components/page/SpaceBackground';
import { AppContext } from '@root/contexts/appContext';
import sortByRating from '@root/helpers/sortByRating';
import useSWRHelper from '@root/hooks/useSWRHelper';
import { MultiplayerMatchState, MultiplayerMatchType } from '@root/models/constants/multiplayer';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import { useRouter } from 'next/router';
import { useCallback, useContext, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import MatchResults from './matchResults';
import MultiplayerRating from './multiplayerRating';
import OnlineUsers from './onlineUsers';

export default function Multiplayer() {
  const [isCreateMatchModalOpen, setIsCreateMatchModalOpen] = useState(false);
  const { game, multiplayerSocket, user } = useContext(AppContext);
  const router = useRouter();
  const { connectedPlayers, matches, privateAndInvitedMatches } = multiplayerSocket;
  const isCreatingMatch = useRef(false);
  const postNewMatch = useCallback(async (matchType: MultiplayerMatchType, isPrivate: boolean, isRated: boolean) => {
    toast.dismiss();
    toast.loading('Creating Match...');

    if (isCreatingMatch.current) {
      return;
    }

    isCreatingMatch.current = true;
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

      isCreatingMatch.current = false;
      toast.dismiss();
      toast.success('Created Match');
      const createdMatch = await res.json() as MultiplayerMatch;

      if (createdMatch.private) {
        router.push(`/match/${createdMatch.matchId}`);
      }
    }).catch(async err => {
      isCreatingMatch.current = false;
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error || 'Failed to create match');
    });
  }, [router]);

  const btnCreateMatchClick = useCallback(async () => {
    setIsCreateMatchModalOpen(true);
  }, []);

  const { data: recentMatches } = useSWRHelper<MultiplayerMatch[]>('/api/match/search');

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

  if (!user) {
    return <span>Loading</span>;
  }

  return (<>
    <SpaceBackground
      constellationPattern='custom'
      customConstellations={[
        { left: '20%', top: '15%', size: '6px', color: 'bg-blue-400', delay: '0s', duration: '3s', glow: true },
        { left: '40%', top: '20%', size: '5px', color: 'bg-green-400', delay: '0.5s', duration: '2.5s', glow: true },
        { left: '60%', top: '18%', size: '7px', color: 'bg-purple-400', delay: '1s', duration: '3.5s', glow: true },
        { left: '80%', top: '25%', size: '6px', color: 'bg-pink-400', delay: '1.5s', duration: '2.8s', glow: true },
        { left: '35%', top: '30%', size: '5px', color: 'bg-yellow-400', delay: '2s', duration: '3.2s', glow: true },
        { left: '70%', top: '35%', size: '6px', color: 'bg-cyan-400', delay: '0.3s', duration: '2.9s', glow: true },
      ]}
      showGeometricShapes={true}
    >
    <div className='relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12'>
      {/* Header Section */}
      <div className='text-center mb-8 animate-fadeInDown'>
        <h1 className='font-bold text-3xl sm:text-4xl lg:text-5xl mb-4'>
          <span className='bg-gradient-to-r from-blue-400 via-green-400 to-purple-400 bg-clip-text text-transparent'>
            Multiplayer Arena
          </span>
        </h1>
        <p className='text-base sm:text-lg text-gray-200 max-w-2xl mx-auto animate-fadeInUp px-2' style={{ animationDelay: '0.2s' }}>
          Challenge players worldwide in real-time {game.displayName} matches.
          Climb the rankings and prove your skills!
        </p>
      </div>

      {/* Online Players Indicator and Create Match Button */}
      <div className='flex flex-col sm:flex-row justify-center items-center gap-4 mb-8 animate-fadeInUp' style={{ animationDelay: '0.3s' }}>
        <OnlineUsers />
        {!hasCreatedMatch && (
          <button
            className='group relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300'
            onClick={btnCreateMatchClick}
          >
            <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-700' />
            <div className='relative flex items-center gap-2 justify-center'>
              <span className='text-lg'>⚔️</span>
              <span className='text-sm sm:text-base'>Create Match</span>
            </div>
          </button>
        )}
      </div>

      {/* Main Content Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-8'>
        {/* Left Column - Your Stats */}
        <div className='lg:col-span-1 animate-fadeInLeft' style={{ animationDelay: '0.4s' }}>
          <div className='relative'>
            <div className='absolute -inset-2 bg-gradient-to-r from-blue-600/15 to-purple-600/15 blur-lg opacity-40' />
            <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
              <div className='text-center mb-4'>
                <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3'>
                  <span className='text-2xl text-white'>⚔️</span>
                </div>
                <h3 className='text-lg font-bold'>
                  <span className='bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent'>
                    Your Ratings
                  </span>
                </h3>
              </div>
              <div className='space-y-3'>
                <div className='flex items-center justify-between p-2 bg-white/5 rounded-lg'>
                  <span className='text-sm text-white/70'>Bullet</span>
                  <MultiplayerRating profile={user.multiplayerProfile} type={MultiplayerMatchType.RushBullet} />
                </div>
                <div className='flex items-center justify-between p-2 bg-white/5 rounded-lg'>
                  <span className='text-sm text-white/70'>Blitz</span>
                  <MultiplayerRating profile={user.multiplayerProfile} type={MultiplayerMatchType.RushBlitz} />
                </div>
                <div className='flex items-center justify-between p-2 bg-white/5 rounded-lg'>
                  <span className='text-sm text-white/70'>Rapid</span>
                  <MultiplayerRating profile={user.multiplayerProfile} type={MultiplayerMatchType.RushRapid} />
                </div>
                <div className='flex items-center justify-between p-2 bg-white/5 rounded-lg'>
                  <span className='text-sm text-white/70'>Classical</span>
                  <MultiplayerRating profile={user.multiplayerProfile} type={MultiplayerMatchType.RushClassical} />
                </div>
              </div>
            </div>
          </div>

          {/* How to Play */}
          <div className='relative mt-6'>
            <div className='absolute -inset-2 bg-gradient-to-r from-green-600/15 to-emerald-600/15 blur-lg opacity-40' />
            <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
              <div className='text-center mb-4'>
                <div className='w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3'>
                  <span className='text-2xl text-white'>📖</span>
                </div>
                <h3 className='text-lg font-bold'>
                  <span className='bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent'>
                    How to Play
                  </span>
                </h3>
              </div>
              <ul className='text-sm text-white/80 space-y-2'>
                <li className='flex items-start'>
                  <span className='text-green-400 mr-2'>•</span>
                  <span>Solve as many levels as you can</span>
                </li>
                <li className='flex items-start'>
                  <span className='text-green-400 mr-2'>•</span>
                  <span>Levels get progressively harder</span>
                </li>
                <li className='flex items-start'>
                  <span className='text-green-400 mr-2'>•</span>
                  <span>You can skip one level per match</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Currently Online Players */}
          <div className='relative mt-6'>
            <div className='absolute -inset-2 bg-gradient-to-r from-purple-600/15 to-pink-600/15 blur-lg opacity-40' />
            <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
              <div className='text-center mb-4'>
                <div className='w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3'>
                  <span className='text-2xl text-white'>👥</span>
                </div>
                <h3 className='text-lg font-bold'>
                  <span className='bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent'>
                    Players Online
                  </span>
                </h3>
              </div>
              <div className='max-h-64 overflow-y-auto space-y-2'>
                {connectedPlayers.length === 0 ? (
                  <p className='text-center text-white/60 text-sm'>No other players online</p>
                ) : (
                  connectedPlayers.map(player => (
                    <div key={'multiplayer-' + player._id.toString()} className='bg-white/5 rounded-lg p-2 border border-white/10'>
                      <FormattedUser id='multiplayer' user={player} />
                      <div className='mt-1 flex flex-wrap gap-1'>
                        <MultiplayerRating profile={player.multiplayerProfile} type={MultiplayerMatchType.RushBullet} />
                        <MultiplayerRating profile={player.multiplayerProfile} type={MultiplayerMatchType.RushBlitz} />
                        <MultiplayerRating profile={player.multiplayerProfile} type={MultiplayerMatchType.RushRapid} />
                        <MultiplayerRating profile={player.multiplayerProfile} type={MultiplayerMatchType.RushClassical} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Center Column - Matches */}
        <div className='lg:col-span-2 animate-fadeInUp' style={{ animationDelay: '0.5s' }}>
          {/* Open Matches */}
          {openMatches.length > 0 && (
            <div className='mb-6'>
              <h2 className='text-xl font-bold mb-4'>
                <span className='bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent'>
                  Open Matches
                </span>
              </h2>
              <div className='space-y-3'>
                {openMatches.sort((a, b) => sortByRating(a.players[0], b.players[0], MultiplayerMatchType.RushBullet)).map((match: MultiplayerMatch) => (
                  <MatchStatus key={match._id.toString()} match={match} />
                ))}
              </div>
            </div>
          )}

          {/* Active Matches */}
          {activeMatches.length > 0 && (
            <div className='mb-6'>
              <h2 className='text-xl font-bold mb-4'>
                <span className='bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent'>
                  Active Matches
                </span>
              </h2>
              <div className='space-y-3'>
                {activeMatches.map((match: MultiplayerMatch) => (
                  <MatchStatus key={match._id.toString()} match={match} />
                ))}
              </div>
            </div>
          )}

          {/* Recent Matches */}
          <div>
            <h2 className='text-xl font-bold mb-4'>
              <span className='bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent'>
                Recent Matches
              </span>
            </h2>
            {!recentMatches || recentMatches.length === 0 ? (
              <div className='text-center text-white/60 py-8'>No recent matches to display</div>
            ) : (
              <div className='space-y-3'>
                {recentMatches.map((match: MultiplayerMatch) => (
                  <MatchResults key={match._id.toString()} match={match} showViewLink={true} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </SpaceBackground>
    <CreateMatchModal
      isOpen={isCreateMatchModalOpen}
      closeModal={() => {
        setIsCreateMatchModalOpen(false);
      }}
      onConfirm={(matchType: MultiplayerMatchType, isPrivate: boolean, isRated: boolean) => {
        setIsCreateMatchModalOpen(false);
        postNewMatch(matchType, isPrivate, isRated);
      }}
    />
  </>);
}
