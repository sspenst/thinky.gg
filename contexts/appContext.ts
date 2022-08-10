import { createContext } from 'react';

interface AppContextInterface {
  setIsLoading: (isLoading: boolean | undefined) => void;
  setShouldAttemptSWR: React.Dispatch<React.SetStateAction<boolean>>;
  shouldAttemptSWR: boolean;
}

export const AppContext = createContext<AppContextInterface>({
  setIsLoading: () => { return; },
  setShouldAttemptSWR: () => { return; },
  shouldAttemptSWR: true,
});
