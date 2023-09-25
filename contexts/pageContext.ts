import { createContext } from 'react';

interface PageContextInterface {
  preventKeyDownEvent: boolean;
  setShowHeader: React.Dispatch<React.SetStateAction<boolean>>;
  setPreventKeyDownEvent: React.Dispatch<React.SetStateAction<boolean>>;
  showHeader: boolean;
  showAudioSettings: boolean;
  setShowAudioSettings: React.Dispatch<React.SetStateAction<boolean>>;
}

export const PageContext = createContext<PageContextInterface>({
  preventKeyDownEvent: false,
  setShowHeader: () => { return; },
  setPreventKeyDownEvent: () => { return; },
  showHeader: true,
  showAudioSettings: false,
  setShowAudioSettings: () => { return; },
});
