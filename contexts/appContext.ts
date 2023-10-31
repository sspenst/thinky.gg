import Collection from '@root/models/db/collection';
import { createContext } from 'react';
import { KeyedMutator } from 'swr';
import { ReqUser } from '../models/db/user';
import UserConfig from '../models/db/userConfig';
import { MultiplayerSocket } from '../pages/_app';

interface AppContextInterface {
  forceUpdate: () => void;
  multiplayerSocket: MultiplayerSocket;
  mutatePlayLater: () => void;
  mutateUser: KeyedMutator<ReqUser>;
  playLater?: { [key: string]: boolean };
  setShouldAttemptAuth: React.Dispatch<React.SetStateAction<boolean>>;
  setTheme: React.Dispatch<React.SetStateAction<string | undefined>>;
  shouldAttemptAuth: boolean;
  sounds: { [key: string]: HTMLAudioElement };
  tempCollection?: Collection;
  setTempCollection: React.Dispatch<React.SetStateAction<Collection | undefined>>;
  theme: string | undefined;
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
  mutatePlayLater: () => { return; },
  mutateUser: {} as KeyedMutator<ReqUser>,
  playLater: undefined,
  setShouldAttemptAuth: () => { return; },
  setTheme: () => { return; },
  shouldAttemptAuth: true,
  sounds: {},
  theme: undefined,
  tempCollection: undefined,
  setTempCollection: () => { return; },
  userLoading: true,
});
