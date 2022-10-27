import { createContext } from 'react';
import WindowSize from '../models/windowSize';

interface PageContextInterface {
  forceUpdate: () => void;
  preventKeyDownEvent: boolean;
  setPreventKeyDownEvent: React.Dispatch<React.SetStateAction<boolean>>;
  windowSize: WindowSize;
}

export const PageContext = createContext<PageContextInterface>({
  forceUpdate: () => { return; },
  preventKeyDownEvent: false,
  setPreventKeyDownEvent: () => { return; },
  windowSize: {
    height: 0,
    width: 0,
  },
});
