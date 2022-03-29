import WindowSize from '../models/windowSize';
import { createContext } from 'react';

interface PageContextInterface {
  setIsLoading: (isLoading: boolean | undefined) => void;
  windowSize: WindowSize;
}

export const PageContext = createContext<PageContextInterface>({
  setIsLoading: () => { return; },
  windowSize: {
    height: 0,
    width: 0,
  },
});
