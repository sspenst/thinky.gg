import { createContext, Dispatch, SetStateAction } from 'react';

interface HeaderContextProps {
  toggleVersion: (type?: 'hot' | 'cool') => void;
  setToggleVersion: Dispatch<SetStateAction<() => void>>;

}

export const HeaderContext = createContext<HeaderContextProps>({
  toggleVersion: () => {},
  setToggleVersion: () => {},

});
