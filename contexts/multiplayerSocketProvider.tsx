import { Game } from '@root/constants/Games';
import { useMultiplayerSocket } from '@root/hooks/useMultiplayerSocket';
import { NotificationActions } from '@root/hooks/useNotifications';
import Notification from '@root/models/db/notification';
import User from '@root/models/db/user';
import React, { ReactNode } from 'react';
import { MultiplayerSocketContext } from './appContext';

interface MultiplayerSocketProviderProps {
  children: ReactNode;
  notificationActions: NotificationActions;
  notifications: Notification[];
  selectedGame: Game;
  user: User | null | undefined;
}

/**
 * Owns the multiplayer socket state so that its high-frequency updates (connectedPlayers /
 * matches broadcasts) only re-render this provider and the components that read the context
 * below — NOT the whole app tree. `children` is passed through unchanged, so as long as the
 * parent (_app) does not itself re-render, a socket update will not re-render the page.
 */
export default function MultiplayerSocketProvider({
  children,
  notificationActions,
  notifications,
  selectedGame,
  user,
}: MultiplayerSocketProviderProps) {
  const multiplayerSocket = useMultiplayerSocket(user, selectedGame, notifications, notificationActions);

  return (
    <MultiplayerSocketContext.Provider value={multiplayerSocket}>
      {children}
    </MultiplayerSocketContext.Provider>
  );
}
