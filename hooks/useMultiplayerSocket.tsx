import { AnimateCounterOne } from '@root/components/counters/AnimateCounterOne';
import AlertType from '@root/constants/alertType';
import { Game } from '@root/constants/Games';
import Notification from '@root/models/db/notification';
import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { io, Socket } from 'socket.io-client';
import { MultiplayerMatchState } from '../models/constants/multiplayer';
import MultiplayerMatch from '../models/db/multiplayerMatch';
import User, { UserWithMultiMultiplayerProfile, UserWithMultiplayerProfile } from '../models/db/user';
import { NotificationActions } from './useNotifications';

export interface MultiplayerSocket {
  connectedPlayers: UserWithMultiplayerProfile[];
  connectedPlayersCount: number;
  matches: MultiplayerMatch[];
  privateAndInvitedMatches: MultiplayerMatch[];
  socket: Socket<DefaultEventsMap, DefaultEventsMap> | undefined;
}

export function useMultiplayerSocket(
  user: User | null | undefined,
  selectedGame: Game,
  notifications: Notification[],
  notificationActions: NotificationActions
) {
  const router = useRouter();
  const [multiplayerSocket, setMultiplayerSocket] = useState<MultiplayerSocket>({
    connectedPlayers: [],
    connectedPlayersCount: 0,
    matches: [],
    privateAndInvitedMatches: [],
    socket: undefined,
  });

  // Socket connection management
  useEffect(() => {
    if (!user?._id) {
      setMultiplayerSocket(prevMultiplayerSocket => {
        if (prevMultiplayerSocket.socket) {
          const socketConn = prevMultiplayerSocket.socket;

          socketConn.off('connectedPlayers');
          socketConn.off('matches');
          socketConn.off('privateAndInvitedMatches');
          socketConn.off('notifications');
          socketConn.off('reloadPage');
          socketConn.off('killSocket');
          socketConn.disconnect();
        }

        return {
          connectedPlayers: [],
          connectedPlayersCount: 0,
          matches: [],
          privateAndInvitedMatches: [],
          socket: undefined,
        };
      });

      return;
    }

    const hasPortInUrl = window.location.port !== '';

    const socketConn = io('', {
      // we should not try to connect when running in dev mode (localhost:3000)
      autoConnect: !hasPortInUrl,
      path: '/api/socket/',
      withCredentials: true,
    });

    socketConn.on('alert', (message) => {
      switch (message.type) {
      case AlertType.STREAK: {
        if (user.disableStreakPopup) {
          return;
        }

        const { streak, gameId } = message.data;

        toast.success(
          React.createElement(AnimateCounterOne, { gameId, value: streak }),
          {
            duration: 3500,
            icon: null,
            style: {
              minWidth: '200px',
            }
          }
        );
        break;
      }
      }
    });

    socketConn.on('notifications', notificationActions.handleSocketNotifications);
    socketConn.on('reloadPage', () => {
      toast.dismiss();
      toast.loading('There is a new version of the site! Reloading page in 15 seconds...', {
        duration: 15000,
      });
      setTimeout(() => {
        window.location.reload();
      }, 15000);
    } );
    socketConn.on('killSocket', () => {
      console.log('killSocket');
      socketConn.disconnect();
    });
    socketConn.on('connectedPlayers', (connectedPlayers: {
      count: number;
      users: UserWithMultiMultiplayerProfile[];
    }) => {
      connectedPlayers.users.forEach(player => {
        if (player.multiplayerProfile === undefined) {
          return;
        }
      });
      setMultiplayerSocket(prevMultiplayerSocket => {
        return {
          connectedPlayers: connectedPlayers.users as UserWithMultiplayerProfile[],
          connectedPlayersCount: connectedPlayers.count,
          matches: prevMultiplayerSocket.matches,
          privateAndInvitedMatches: prevMultiplayerSocket.privateAndInvitedMatches,
          socket: prevMultiplayerSocket.socket,
        };
      });
    });

    socketConn.on('matches', (matches: MultiplayerMatch[]) => {
      setMultiplayerSocket(prevMultiplayerSocket => {
        return {
          connectedPlayers: prevMultiplayerSocket.connectedPlayers,
          connectedPlayersCount: prevMultiplayerSocket.connectedPlayersCount,
          matches: matches,
          privateAndInvitedMatches: prevMultiplayerSocket.privateAndInvitedMatches,
          socket: prevMultiplayerSocket.socket,
        };
      });
    });

    socketConn.on('privateAndInvitedMatches', (privateAndInvitedMatches: MultiplayerMatch[]) => {
      setMultiplayerSocket(prevMultiplayerSocket => {
        return {
          connectedPlayers: prevMultiplayerSocket.connectedPlayers,
          connectedPlayersCount: prevMultiplayerSocket.connectedPlayersCount,
          matches: prevMultiplayerSocket.matches,
          privateAndInvitedMatches: privateAndInvitedMatches,
          socket: prevMultiplayerSocket.socket,
        };
      });
    });

    setMultiplayerSocket(prevMultiplayerSocket => {
      return {
        connectedPlayers: prevMultiplayerSocket.connectedPlayers,
        connectedPlayersCount: prevMultiplayerSocket.connectedPlayersCount,
        matches: prevMultiplayerSocket.matches,
        privateAndInvitedMatches: prevMultiplayerSocket.privateAndInvitedMatches,
        socket: socketConn,
      };
    });

    return () => {
      socketConn.off('connectedPlayers');
      socketConn.off('matches');
      socketConn.off('privateAndInvitedMatches');
      socketConn.off('notifications');
      socketConn.off('reloadPage');
      socketConn.off('killSocket');
      socketConn.disconnect();
    };
  }, [selectedGame.id, user?._id, user?.disableStreakPopup, notificationActions.handleSocketNotifications]);

  // Handle match redirects
  useEffect(() => {
    const { matches, privateAndInvitedMatches } = multiplayerSocket;

    for (const match of matches) {
      // if match is active and includes user, then redirect to match page /match/[matchId]
      if (match.state === MultiplayerMatchState.ACTIVE && match.players.some((player: User) => player?._id?.toString() === user?._id?.toString())) {
        // match sure current url isn't this
        if (router.pathname.indexOf('/[subdomain]/match/') >= 0 && router.query.matchId === match.matchId) {
          return;
        }

        // if the current tab is active
        if (document.visibilityState === 'visible') {
          router.push(`/match/${match.matchId}`);
        }

        return;
      }
    }

    for (const match of privateAndInvitedMatches) {
      // if match is active and includes user, then redirect to match page /match/[matchId]
      if (match.state === MultiplayerMatchState.ACTIVE && match.players.some((player: User) => player?._id?.toString() === user?._id?.toString())) {
        // match sure current url isn't this
        if (router.pathname.indexOf('/[subdomain]/match/') >= 0 && router.query.matchId === match.matchId) {
          return;
        }

        // if the current tab is active
        if (document.visibilityState === 'visible') {
          router.push(`/match/${match.matchId}`);
        }

        return;
      }
    }
  }, [multiplayerSocket.matches, multiplayerSocket.privateAndInvitedMatches, router, user]);

  return multiplayerSocket;
}
