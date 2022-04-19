import WindowSize from '../models/windowSize';
import { createContext } from 'react';

interface PageContextInterface {
  forceUpdate: () => void;
  isModalOpen: boolean;
  setIsModalOpen: (isModalOpen: boolean) => void;
  windowSize: WindowSize;
}

export const PageContext = createContext<PageContextInterface>({
  forceUpdate: () => { return; },
  isModalOpen: false,
  setIsModalOpen: () => { return; },
  windowSize: {
    height: 0,
    width: 0,
  },
});
