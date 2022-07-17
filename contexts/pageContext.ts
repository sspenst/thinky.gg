import WindowSize from '../models/windowSize';
import { createContext } from 'react';

interface PageContextInterface {
  forceUpdate: () => void;
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>;
  // show the sidebar whenever possible
  showSidebar: boolean;
  windowSize: WindowSize;
}

export const PageContext = createContext<PageContextInterface>({
  forceUpdate: () => { return; },
  isModalOpen: false,
  setIsModalOpen: () => { return; },
  setShowSidebar: () => { return; },
  showSidebar: true,
  windowSize: {
    height: 0,
    width: 0,
  },
});
