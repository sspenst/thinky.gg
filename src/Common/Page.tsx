import React, { useEffect } from 'react';
import './index.css';
import { WindowSizeContext } from './WindowSizeContext';
import useWindowSize from './useWindowSize';
import Dimensions from '../Constants/Dimensions';
import Menu from './Menu';
import LevelOptions from '../Models/LevelOptions';
import { To } from 'react-router-dom';

interface PageProps {
  children: JSX.Element;
  escapeTo?: To;
  levelOptions?: LevelOptions;
  title: string | undefined;
}

export default function Page({ children, escapeTo, levelOptions, title }: PageProps) {
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
        escapeTo={escapeTo}
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
