import { createContext } from 'react';

interface PageContextInterface {
  preventKeyDownEvent: boolean;
  setPreventKeyDownEvent: React.Dispatch<React.SetStateAction<boolean>>;
}

export const PageContext = createContext<PageContextInterface>({
  preventKeyDownEvent: false,
  setPreventKeyDownEvent: () => { return; },
});
