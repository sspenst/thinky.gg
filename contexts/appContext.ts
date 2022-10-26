import { createContext } from 'react';
import { ReqUser } from '../models/db/user';
import UserConfig from '../models/db/userConfig';

interface AppContextInterface {
  mutateUser: () => void;
  setIsLoading: (isLoading: boolean | undefined) => void;
  setShouldAttemptAuth: React.Dispatch<React.SetStateAction<boolean>>;
  shouldAttemptAuth: boolean;
  user?: ReqUser;
  userConfig?: UserConfig;
  userLoading: boolean;
}

export const AppContext = createContext<AppContextInterface>({
  mutateUser: () => { return; },
  setIsLoading: () => { return; },
  setShouldAttemptAuth: () => { return; },
  shouldAttemptAuth: true,
  userLoading: true,
});
