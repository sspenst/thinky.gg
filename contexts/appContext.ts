import { createContext } from 'react';
import { ReqUser } from '../models/db/user';
import { MultiplayerSocket } from '../pages/_app';

interface AppContextInterface {
  mutateUser: () => void;
  user?: ReqUser;
  userLoading: boolean;
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
  mutateUser: () => { return; },
  setShouldAttemptAuth: () => { return; },
  shouldAttemptAuth: true,
  userLoading: true,

});
