import { DeviceInfo, ScreenSize } from '@root/hooks/useDeviceCheck';
import Collection from '@root/models/db/collection';
import Notification from '@root/models/db/notification';
import { createContext } from 'react';
import { KeyedMutator } from 'swr';
import { ReqUser } from '../models/db/user';
import UserConfig from '../models/db/userConfig';
import { MultiplayerSocket } from '../pages/_app';

interface AppContextInterface {
  deviceInfo: DeviceInfo;
  forceUpdate: () => void;
  notifications: Notification[];
  multiplayerSocket: MultiplayerSocket;
  mutatePlayLater: () => void;
  mutateUser: KeyedMutator<ReqUser>;
  playLater?: { [key: string]: boolean };
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  setShouldAttemptAuth: React.Dispatch<React.SetStateAction<boolean>>;
  setTempCollection: React.Dispatch<React.SetStateAction<Collection | undefined>>;
  setTheme: React.Dispatch<React.SetStateAction<string | undefined>>;
  shouldAttemptAuth: boolean;
  sounds: { [key: string]: HTMLAudioElement };
  tempCollection?: Collection;
  theme: string | undefined;
  user?: ReqUser;
  userConfig?: UserConfig;
  userLoading: boolean;
}

export const AppContext = createContext<AppContextInterface>({
  deviceInfo: {
    isMobile: false,
    isAndroid: false,
    isIOS: false,
    isFirefox: false,
    isWindows: false,
    isLinux: false,
    isMac: false,
    screenSize: ScreenSize.SM,
  },
  forceUpdate: () => { return; },
  notifications: [],
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
  setNotifications: () => { return; },
  setShouldAttemptAuth: () => { return; },
  setTempCollection: () => { return; },
  setTheme: () => { return; },
  shouldAttemptAuth: true,
  sounds: {},
  tempCollection: undefined,
  theme: undefined,
  userLoading: true,
});
