import { DefaultEventsMap } from '@socket.io/mongo-emitter/dist/typed-events';
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import MultiplayerMatch from '../models/db/multiplayerMatch';
import { UserWithMultiplayerProfile } from '../models/db/user';

export const useMultiplayerSocket = () => {
  const [connectedPlayers, setConnectedPlayers] = useState<UserWithMultiplayerProfile[]>([]);
  const [connectedPlayersCount, setConnectPlayersCount] = useState(0);
  const [matches, setMatches] = useState<MultiplayerMatch[]>([]);
  const [privateAndInvitedMatches, setPrivateAndInvitedMatches] = useState<MultiplayerMatch[]>([]);

  const [isCreateMatchModalOpen, setIsCreateMatchModalOpen] = useState(false);
  const [socket, setSocket] = useState<Socket<DefaultEventsMap, DefaultEventsMap>>();

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

  return { socket, matches, privateAndInvitedMatches, connectedPlayers, connectedPlayersCount };
};
