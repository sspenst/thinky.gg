import FormattedUser from '@root/components/formatted/formattedUser';
import CreateMatchModal from '@root/components/modal/createMatchModal';
import MatchStatus from '@root/components/multiplayer/matchStatus';
import { AppContext } from '@root/contexts/appContext';
import { createMatchMetadata, filterDiscordRoomMatches } from '@root/helpers/discordMetadata';
import sortByRating from '@root/helpers/sortByRating';
import { MultiplayerMatchState, MultiplayerMatchType } from '@root/models/constants/multiplayer';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import { useRouter } from 'next/router';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import MultiplayerRating from '../multiplayer/multiplayerRating';

interface SuccessStateProps {
  frameId?: string;
  channelId?: string;
  guildId?: string;
  userId?: string;
  userToken?: string;
  sessionId?: string;
  instanceId?: string;
  connectionInfo: any;
}

type DiscordMultiplayerState = 'lobby' | 'in-match' | 'viewing-match';

export default function SuccessState({
  frameId,
  channelId,
  guildId,
  userId,
  userToken,
  sessionId,
  instanceId,
  connectionInfo
}: SuccessStateProps) {
  const { user, mutateUser, game, multiplayerSocket } = useContext(AppContext);
  const router = useRouter();
  const { connectedPlayers, matches, privateAndInvitedMatches } = multiplayerSocket;
  const [currentState, setCurrentState] = useState<DiscordMultiplayerState>('lobby');
  const [isCreateMatchModalOpen, setIsCreateMatchModalOpen] = useState(false);
  const [discordRoomMatches, setDiscordRoomMatches] = useState<MultiplayerMatch[]>([]);
  const isCreatingMatch = useRef(false);

  // Check if user is in an active match
  useEffect(() => {
    const allMatches = [...matches, ...privateAndInvitedMatches];
    const userActiveMatch = allMatches.find(match =>
      match.players.some(player => player._id.toString() === user?._id?.toString()) &&
      match.state === MultiplayerMatchState.ACTIVE
    );

    if (userActiveMatch) {
      setCurrentState('in-match');
    } else {
      setCurrentState('lobby');
    }
  }, [matches, privateAndInvitedMatches, user?._id]);

  // Filter matches for Discord room (using instanceId)
  useEffect(() => {
    if (instanceId) {
      // For Discord embedded activities, we can use instanceId to group players
      // This creates a "room" effect where players in the same Discord channel
      // can easily find and join each other's matches
      const roomMatches = filterDiscordRoomMatches(matches, instanceId, channelId);

      setDiscordRoomMatches(roomMatches.filter(match => match.state === MultiplayerMatchState.OPEN));
    }
  }, [matches, instanceId, channelId]);

  const postNewMatch = useCallback(async (matchType: MultiplayerMatchType, isPrivate: boolean, isRated: boolean) => {
    toast.dismiss();
    toast.loading('Creating Match...');

    if (isCreatingMatch.current) {
      return;
    }

    isCreatingMatch.current = true;

    // Include Discord-specific metadata for the match
    const matchData: any = {
      private: isPrivate,
      rated: isRated,
      type: matchType
    };

    // Add Discord metadata if available
    const metadata = createMatchMetadata({
      instanceId,
      channelId,
      guildId,
      frameId,
      sessionId,
      userId,
      userToken
    });

    if (metadata) {
      matchData.metadata = metadata;
    }

    fetch('/api/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(matchData),
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
  }, [router, instanceId, channelId, guildId, frameId, sessionId, userId, userToken]);

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

  if (!user) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4'>
        <div className='bg-blue-600 rounded-lg p-6 max-w-md text-center'>
          <div className='w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600' />
          </div>
          <h2 className='text-xl font-bold mb-2'>Loading...</h2>
          <p className='text-sm'>Preparing your multiplayer experience</p>
        </div>
      </div>
    );
  }

  // Render different states
  if (currentState === 'in-match') {
    const userMatch = [...matches, ...privateAndInvitedMatches].find(match =>
      match.players.some(player => player._id.toString() === user?._id?.toString()) &&
      match.state === MultiplayerMatchState.ACTIVE
    );

    if (userMatch) {
      return (
        <div className='flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4'>
          <div className='bg-purple-600 rounded-lg p-6 max-w-md text-center'>
            <div className='w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4'>
              <svg className='w-6 h-6 text-purple-600' fill='currentColor' viewBox='0 0 24 24'>
                <path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
              </svg>
            </div>
            <h2 className='text-xl font-bold mb-2'>Match in Progress!</h2>
            <p className='text-sm mb-4'>You are currently in an active match</p>
            <MatchStatus match={userMatch} isMatchPage={true} />
            <button
              onClick={() => router.push(`/match/${userMatch.matchId}`)}
              className='mt-4 px-6 py-3 bg-white text-purple-600 rounded-lg font-bold hover:bg-gray-100 transition-colors'
            >
              Continue Match
            </button>
          </div>
        </div>
      );
    }
  }

  // Main lobby view
  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4'>
      <div className='bg-green-600 rounded-lg p-6 max-w-2xl w-full text-center'>
        <div className='w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4'>
          <svg className='w-6 h-6 text-green-600' fill='currentColor' viewBox='0 0 24 24'>
            <path d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z' />
          </svg>
        </div>
        <h2 className='text-xl font-bold mb-2'>Welcome to {game.displayName} Multiplayer!</h2>
        <p className='text-sm mb-4'>Ready to play with your Discord friends?</p>
        
        {/* User Info */}
        <div className='bg-gray-800 rounded p-3 mb-4 text-left'>
          <div className='flex items-center gap-3 mb-2'>
            <FormattedUser id='discord-multiplayer' user={user} />
            <div className='flex gap-1'>
              <MultiplayerRating profile={user.multiplayerProfile} type={MultiplayerMatchType.RushBullet} />
              <MultiplayerRating profile={user.multiplayerProfile} type={MultiplayerMatchType.RushBlitz} />
              <MultiplayerRating profile={user.multiplayerProfile} type={MultiplayerMatchType.RushRapid} />
              <MultiplayerRating profile={user.multiplayerProfile} type={MultiplayerMatchType.RushClassical} />
            </div>
          </div>
          <p className='text-xs text-gray-300'>
            Connected via Discord • {connectedPlayers.length} players online
          </p>
        </div>
        {/* Discord Room Section */}
        {instanceId && (
          <div className='bg-blue-600 rounded p-4 mb-4'>
            <h3 className='font-bold mb-2'>🎮 Discord Channel Room</h3>
            <p className='text-sm mb-3'>
              Join matches created by players in this Discord channel
            </p>
            {discordRoomMatches.length > 0 ? (
              <div className='space-y-2'>
                {discordRoomMatches.slice(0, 3).map((match) => (
                  <MatchStatus key={match._id.toString()} match={match} />
                ))}
                {discordRoomMatches.length > 3 && (
                  <p className='text-xs text-gray-300'>
                    +{discordRoomMatches.length - 3} more matches in this channel
                  </p>
                )}
              </div>
            ) : (
              <p className='text-sm text-gray-300 italic'>
                No active matches in this Discord channel
              </p>
            )}
          </div>
        )}
        {/* Create Match Button */}
        {!hasCreatedMatch && (
          <div className='mb-4'>
            <button
              onClick={btnCreateMatchClick}
              className='bg-white text-green-600 font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors'
            >
              Create New Match
            </button>
          </div>
        )}
        {/* All Open Matches */}
        {openMatches.length > 0 && (
          <div className='mb-4'>
            <h3 className='font-bold mb-2'>Open Matches</h3>
            <div className='space-y-2 max-h-40 overflow-y-auto'>
              {openMatches
                .sort((a, b) => sortByRating(a.players[0], b.players[0], MultiplayerMatchType.RushBullet))
                .slice(0, 3)
                .map((match: MultiplayerMatch) => (
                  <MatchStatus key={match._id.toString()} match={match} />
                ))}
            </div>
          </div>
        )}
        {/* Active Matches */}
        {activeMatches.length > 0 && (
          <div className='mb-4'>
            <h3 className='font-bold mb-2'>Active Matches</h3>
            <div className='space-y-2 max-h-40 overflow-y-auto'>
              {activeMatches.slice(0, 3).map((match: MultiplayerMatch) => (
                <MatchStatus key={match._id.toString()} match={match} />
              ))}
            </div>
          </div>
        )}
        {/* Online Players */}
        <div className='mb-4'>
          <h3 className='font-bold mb-2'>Online Players</h3>
          <div className='space-y-1 max-h-32 overflow-y-auto'>
            {connectedPlayers.slice(0, 5).map(player => (
              <div key={'discord-multiplayer-' + player._id.toString()} className='flex items-center gap-2 text-sm'>
                <FormattedUser id='discord-multiplayer' user={player} />
                <MultiplayerRating profile={player.multiplayerProfile} type={MultiplayerMatchType.RushBullet} />
              </div>
            ))}
            {connectedPlayers.length > 5 && (
              <p className='text-xs text-gray-300'>
                +{connectedPlayers.length - 5} more players online
              </p>
            )}
          </div>
        </div>
        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <details className='text-left text-xs bg-gray-800 rounded p-3'>
            <summary className='cursor-pointer'>Debug Info</summary>
            <p><strong>Frame ID:</strong> {frameId || 'N/A'}</p>
            <p><strong>Channel ID:</strong> {channelId || 'N/A'}</p>
            <p><strong>Guild ID:</strong> {guildId || 'N/A'}</p>
            <p><strong>Instance ID:</strong> {instanceId || 'N/A'}</p>
            <p><strong>Session ID:</strong> {sessionId || 'N/A'}</p>
            <p><strong>User:</strong> {user?.name || 'N/A'}</p>
            <p><strong>Timestamp:</strong> {connectionInfo.timestamp}</p>
          </details>
        )}
      </div>
      {/* Create Match Modal */}
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
    </div>
  );
}
