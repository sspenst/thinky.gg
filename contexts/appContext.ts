import { createContext } from 'react';

interface AppContextInterface {
  setIsLoading: (isLoading: boolean | undefined) => void;
}

export const AppContext = createContext<AppContextInterface>({
  setIsLoading: () => { return; },
});
