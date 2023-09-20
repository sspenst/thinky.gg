import React, { FunctionComponent, ReactNode, useState } from 'react';
import { HeaderContext } from './headerContext';

interface HeaderProviderProps {
  children: ReactNode;
}

export const HeaderProvider: FunctionComponent<HeaderProviderProps> = ({ children }) => {
  const [toggleVersion, setToggleVersion] = useState<() => void>(() => () => {});

  return (
    <HeaderContext.Provider value={{ toggleVersion, setToggleVersion }}>
      {children}
    </HeaderContext.Provider>
  );
};
