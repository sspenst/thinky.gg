import React, { useEffect, useState } from 'react';
import Dimensions from '../constants/dimensions';
import Folder from '../models/folder';
import Menu from './menu';
import { PageContext } from './pageContext';
import ProgressBar from './progressBar';
import useWindowSize from './useWindowSize';

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

  const [isLoading, setIsLoading] = useState<boolean>();
  const windowSize = useWindowSize();

  if (!windowSize) {
    return null;
  }

  return (
    <PageContext.Provider value={{
      setIsLoading: setIsLoading,
      windowSize: {
        // adjust window size to account for menu
        height: windowSize.height - Dimensions.MenuHeight,
        width: windowSize.width,
      },
    }}>
      <ProgressBar isLoading={isLoading} />
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
    </PageContext.Provider>
  );
}
