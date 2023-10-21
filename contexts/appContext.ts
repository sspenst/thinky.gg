import Collection from '@root/models/db/collection';
import { Types } from 'mongoose';
import { createContext } from 'react';
import { KeyedMutator } from 'swr';
import { ReqUser } from '../models/db/user';
import UserConfig from '../models/db/userConfig';
import { MultiplayerSocket } from '../pages/_app';

interface AppContextInterface {
  forceUpdate: () => void;
  multiplayerSocket: MultiplayerSocket;
  mutateUser: KeyedMutator<ReqUser>;
  mutateMyPlayLater: () => void;
  myPlayLater?: Collection;
  setShouldAttemptAuth: React.Dispatch<React.SetStateAction<boolean>>;
  setTheme: React.Dispatch<React.SetStateAction<string | undefined>>;
  shouldAttemptAuth: boolean;
  sounds: { [key: string]: HTMLAudioElement };
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
  mutateUser: {} as KeyedMutator<ReqUser>,
  mutateMyPlayLater: () => { return; },
  myPlayLater: undefined,
  setShouldAttemptAuth: () => { return; },
  setTheme: () => { return; },
  shouldAttemptAuth: true,
  sounds: {},
  theme: undefined,
  userLoading: true,
});
