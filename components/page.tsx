import React, { useEffect } from 'react';
import Dimensions from '../constants/dimensions';
import LevelOptions from '../models/levelOptions';
import Menu from './menu';
import { WindowSizeContext } from './windowSizeContext';
import useWindowSize from './useWindowSize';

interface PageProps {
  children: JSX.Element;
  escapeHref?: string;
  levelOptions?: LevelOptions;
  subtitle?: string;
  title: string;
}

export default function Page({ children, escapeHref, levelOptions, subtitle, title }: PageProps) {
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
        subtitle={subtitle}
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
