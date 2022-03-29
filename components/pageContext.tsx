import WindowSize from '../models/windowSize';
import { createContext } from 'react';

interface PageContextInterface {
  windowSize: WindowSize;
}

export const PageContext = createContext<PageContextInterface>({
  windowSize: {
    height: 0,
    width: 0,
  },
});
