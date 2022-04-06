import WindowSize from '../models/windowSize';
import { createContext } from 'react';

interface PageContextInterface {
  forceUpdate: () => void;
  windowSize: WindowSize;
}

export const PageContext = createContext<PageContextInterface>({
  forceUpdate: () => { return; },
  windowSize: {
    height: 0,
    width: 0,
  },
});
