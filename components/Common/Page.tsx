import React, { useEffect } from 'react';
import { WindowSizeContext } from './WindowSizeContext';
import useWindowSize from './useWindowSize';
import Dimensions from '../Constants/Dimensions';
import Menu from './Menu';
import LevelOptions from '../Models/LevelOptions';

interface PageProps {
  children: JSX.Element;
  escapeHref?: string;
  levelOptions?: LevelOptions;
  title: string | undefined;
}

export default function Page({ children, escapeHref, levelOptions, title }: PageProps) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);

  const windowSize = useWindowSize();

  if (!windowSize) {
    return null;
  }

  return (
    <WindowSizeContext.Provider value={{
      // adjust window size to account for menu
      height: windowSize.height - Dimensions.MenuHeight,
      width: windowSize.width,
    }}>
      <Menu
        escapeHref={escapeHref}
        levelOptions={levelOptions}
        title={title}
      />
      <div style={{
        position: 'fixed',
        top: Dimensions.MenuHeight,
      }}>
        {children}
      </div>
    </WindowSizeContext.Provider>
  );
}
