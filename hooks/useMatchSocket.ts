import { AppContext } from '@root/contexts/appContext';
import { MatchGameState } from '@root/helpers/gameStateHelpers';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import MultiplayerProfile from '@root/models/db/multiplayerProfile';
import { UserWithMultiMultiplayerProfile, UserWithMultiplayerProfile } from '@root/models/db/user';
import { useRouter } from 'next/router';
import { useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';

interface UseMatchSocketProps {
  matchId: string;
  isSpectating: boolean;
}

interface MatchSocketData {
  match: MultiplayerMatch | undefined;
  connectedPlayersInRoom: {count: number, users: UserWithMultiplayerProfile[]} | undefined;
  matchGameStateMap: Record<string, MatchGameState>;
}

export function useMatchSocket({ matchId, isSpectating }: UseMatchSocketProps): MatchSocketData {
  const [match, setMatch] = useState<MultiplayerMatch | undefined>();
  const [connectedPlayersInRoom, setConnectedPlayersInRoom] = useState<{count: number, users: UserWithMultiplayerProfile[]}>();
  const [matchGameStateMap, setMatchGameStateMap] = useState<Record<string, MatchGameState>>({});
  const { game } = useContext(AppContext);
  const router = useRouter();

  useEffect(() => {
    const socketConn = io('', {
      path: '/api/socket/',
      withCredentials: true,
      query: {
        matchId: matchId,
      }
    });

    if (isSpectating) {
      socketConn.on('userMatchGameState', (data: { userId: string, matchGameState: MatchGameState }) => {
        const { userId, matchGameState } = data;

        setMatchGameStateMap(prevMatchGameStateMap => {
          const newMatchGameStateMap = { ...prevMatchGameStateMap };

          newMatchGameStateMap[userId] = matchGameState;

          return newMatchGameStateMap;
        });
      });
    }

    socketConn.on('connectedPlayersInRoom', (players: {count: number, users: UserWithMultiMultiplayerProfile[]}) => {
      // loop through players and remove the multiplayerProfiles that aren't matching the current selected game
      players.users = players.users.map(player => {
        if (!player.multiplayerProfile) {
          return player;
        }

        const mp = player.multiplayerProfile as MultiplayerProfile;

        if (mp.gameId?.toString() !== game.toString()) {
          return {
            ...player,
            multiplayerProfile: undefined
          };
        }

        return player;
      });
      setConnectedPlayersInRoom(players as {count: number, users: UserWithMultiplayerProfile[]});
    });

    socketConn.on('match', (match: MultiplayerMatch) => {
      setMatch(match);
    });

    socketConn.on('matchNotFound', () => {
      toast.dismiss();
      toast.error('Match not found');
      router.push('/multiplayer');
    });

    return () => {
      socketConn.off('match');
      socketConn.off('matchNotFound');
      socketConn.off('connectedPlayersInRoom');
      socketConn.off('userMatchGameState');
      socketConn.disconnect();
    };
  }, [game, isSpectating, matchId, router]);

  return {
    match,
    connectedPlayersInRoom,
    matchGameStateMap,
  };
}
