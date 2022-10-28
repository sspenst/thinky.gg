import { createContext } from 'react';

interface AppContextInterface {
  setIsLoading: (isLoading: boolean | undefined) => void;
  setShouldAttemptAuth: React.Dispatch<React.SetStateAction<boolean>>;
  shouldAttemptAuth: boolean;
}

export const AppContext = createContext<AppContextInterface>({
  setIsLoading: () => { return; },
  setShouldAttemptAuth: () => { return; },
  shouldAttemptAuth: true,
});
