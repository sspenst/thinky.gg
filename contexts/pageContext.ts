import { createContext } from 'react';
import { ReqUser } from '../models/db/user';
import UserConfig from '../models/db/userConfig';
import WindowSize from '../models/windowSize';

interface PageContextInterface {
  forceUpdate: () => void;
  mutateUser: () => void;
  preventKeyDownEvent: boolean;
  setPreventKeyDownEvent: React.Dispatch<React.SetStateAction<boolean>>;
  user?: ReqUser;
  userConfig?: UserConfig;
  userLoading: boolean;
  windowSize: WindowSize;
}

export const PageContext = createContext<PageContextInterface>({
  forceUpdate: () => { return; },
  mutateUser: () => { return; },
  preventKeyDownEvent: false,
  setPreventKeyDownEvent: () => { return; },
  userLoading: true,
  windowSize: {
    height: 0,
    width: 0,
  },
});
