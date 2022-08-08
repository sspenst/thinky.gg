import { createContext } from 'react';
import WindowSize from '../models/windowSize';

interface PageContextInterface {
  forceUpdate: () => void;
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setShouldAttemptSWR: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>;
  shouldAttemptSWR: boolean;
  // show the sidebar whenever possible
  showSidebar: boolean;
  windowSize: WindowSize;
}

export const PageContext = createContext<PageContextInterface>({
  forceUpdate: () => { return; },
  isModalOpen: false,
  setIsModalOpen: () => { return; },
  setShouldAttemptSWR: () => { return; },
  setShowSidebar: () => { return; },
  shouldAttemptSWR: false,
  showSidebar: true,
  windowSize: {
    height: 0,
    width: 0,
  },
});
