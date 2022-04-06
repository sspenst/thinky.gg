import React, { useEffect, useState } from 'react';
import Dimensions from '../constants/dimensions';
import Folder from '../models/folder';
import Menu from './menu';
import { PageContext } from '../contexts/pageContext';
import useWindowSize from '../hooks/useWindowSize';

function useForceUpdate() {
  const [value, setState] = useState(true);
  return () => setState(!value);
}

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

  const forceUpdate = useForceUpdate();
  const windowSize = useWindowSize();

  if (!windowSize) {
    return null;
  }

  return (
    <PageContext.Provider value={{
      forceUpdate: forceUpdate,
      windowSize: {
        // adjust window size to account for menu
        height: windowSize.height - Dimensions.MenuHeight,
        width: windowSize.width,
      },
    }}>
      <Menu
        folders={folders}
        subtitle={subtitle}
        title={title}
      />
      <div style={{
        position: 'fixed',
        top: Dimensions.MenuHeight,
        zIndex: -1,
      }}>
        {children}
      </div>
    </PageContext.Provider>
  );
}
