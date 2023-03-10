import { createContext } from 'react';
import { MultiplayerSocket } from '../pages/_app';

interface AppContextInterface {
  multiplayerSocket: MultiplayerSocket;
  setShouldAttemptAuth: React.Dispatch<React.SetStateAction<boolean>>;
  shouldAttemptAuth: boolean;
}

export const AppContext = createContext<AppContextInterface>({
  multiplayerSocket: {
    connectedPlayers: [],
    connectedPlayersCount: 0,
    matches: [],
    privateAndInvitedMatches: [],
    socket: undefined,
  },
  setShouldAttemptAuth: () => { return; },
  shouldAttemptAuth: true,
});
