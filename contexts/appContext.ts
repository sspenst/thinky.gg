import { GameId } from '@root/constants/GameId';
import { Game, Games } from '@root/constants/Games';
import { DeviceInfo, ScreenSize } from '@root/hooks/useDeviceCheck';
import { MultiplayerSocket } from '@root/hooks/useMultiplayerSocket';
import Collection from '@root/models/db/collection';
import Notification from '@root/models/db/notification';
import { createContext } from 'react';
import { KeyedMutator } from 'swr';
import { ReqUser } from '../models/db/user';
import UserConfig from '../models/db/userConfig';

interface AppContextInterface {
  deviceInfo: DeviceInfo;
  game: Game;
  host: string | undefined;
  multiplayerSocket: MultiplayerSocket;
  mutatePlayLater: () => void;
  mutateUser: KeyedMutator<ReqUser>;
  notifications: Notification[];
  playLater?: { [key: string]: boolean };
  protocol: string | undefined;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  setShouldAttemptAuth: React.Dispatch<React.SetStateAction<boolean>>;
  setShowNav: React.Dispatch<React.SetStateAction<boolean>>;
  setTempCollection: React.Dispatch<React.SetStateAction<Collection | undefined>>;
  shouldAttemptAuth: boolean;
  showNav: boolean;
  sounds: { [key: string]: HTMLAudioElement };
  tempCollection?: Collection;
  user: ReqUser | undefined | null;
  userConfig: UserConfig | undefined | null;
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
  game: Games[GameId.THINKY],
  host: undefined,
  multiplayerSocket: {
    connectedPlayers: [],
    connectedPlayersCount: 0,
    matches: [],
    privateAndInvitedMatches: [],
    socket: undefined,
  },
  mutatePlayLater: () => {},
  mutateUser: {} as KeyedMutator<ReqUser>,
  notifications: [],
  playLater: undefined,
  protocol: undefined,
  setNotifications: () => {},
  setShouldAttemptAuth: () => {},
  setShowNav: () => {},
  setTempCollection: () => {},
  shouldAttemptAuth: true,
  showNav: true,
  sounds: {},
  tempCollection: undefined,
  user: undefined,
  userConfig: undefined,
});
