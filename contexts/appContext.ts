import { createContext } from 'react';

interface AppContextInterface {
  setShouldAttemptAuth: React.Dispatch<React.SetStateAction<boolean>>;
  shouldAttemptAuth: boolean;
}

export const AppContext = createContext<AppContextInterface>({
  setShouldAttemptAuth: () => { return; },
  shouldAttemptAuth: true,
});
