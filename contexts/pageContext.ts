import { createContext } from 'react';

interface PageContextInterface {
  preventKeyDownEvent: boolean;
  setPreventKeyDownEvent: React.Dispatch<React.SetStateAction<boolean>>;
  setShowHeader: React.Dispatch<React.SetStateAction<boolean>>;
  // should set to a component
  setModal: React.Dispatch<React.SetStateAction<React.JSX.Element | null>>;
  showHeader: boolean;
  modal: React.JSX.Element | null;
}

export const PageContext = createContext<PageContextInterface>({
  preventKeyDownEvent: false,
  setPreventKeyDownEvent: () => {},
  setShowHeader: () => {},
  setModal: () => {},
  showHeader: true,
  modal: null,
});
