import React, { useEffect } from 'react';
import Dimensions from '../constants/dimensions';
import Folder from '../models/folder';
import Menu from './menu';
import { WindowSizeContext } from '../contexts/windowSizeContext';
import useWindowSize from '../hooks/useWindowSize';

interface PageProps {
  children: JSX.Element;
  folders?: Folder[];
  subtitle?: string;
  title?: string;
}

export default function Page({
    children,
    folders,
    subtitle,
    title
}: PageProps) {
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
        folders={folders}
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
