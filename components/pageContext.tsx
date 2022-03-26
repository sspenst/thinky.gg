import User from '../models/data/pathology/user';
import WindowSize from '../models/windowSize';
import { createContext } from 'react';

interface PageContextInterface {
  isUserLoading: boolean;
  setIsLoading: (isLoading: boolean | undefined) => void;
  user: User | undefined;
  windowSize: WindowSize;
}

export const PageContext = createContext<PageContextInterface>({
  isUserLoading: true,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setIsLoading: () => {},
  user: undefined,
  windowSize: {
    height: 0,
    width: 0,
  },
});
