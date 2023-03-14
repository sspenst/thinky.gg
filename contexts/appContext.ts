import { createContext } from 'react';
import { KeyedMutator } from 'swr';
import { ReqUser } from '../models/db/user';
import UserConfig from '../models/db/userConfig';
import { MultiplayerSocket } from '../pages/_app';

interface AppContextInterface {
  forceUpdate: () => void;
  multiplayerSocket: MultiplayerSocket;
  mutateUser: KeyedMutator<ReqUser>;
  setShouldAttemptAuth: React.Dispatch<React.SetStateAction<boolean>>;
  shouldAttemptAuth: boolean;
  user?: ReqUser;
  userConfig?: UserConfig;
  userLoading: boolean;
}

export const AppContext = createContext<AppContextInterface>({
  forceUpdate: () => { return; },
  multiplayerSocket: {
    connectedPlayers: [],
    connectedPlayersCount: 0,
    matches: [],
    privateAndInvitedMatches: [],
    socket: undefined,
  },
  mutateUser: {} as KeyedMutator<ReqUser>,
  setShouldAttemptAuth: () => { return; },
  shouldAttemptAuth: true,
  userLoading: true,
});
