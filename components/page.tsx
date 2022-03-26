import React, { useEffect, useState } from 'react';
import Dimensions from '../constants/dimensions';
import LevelOptions from '../models/levelOptions';
import Menu from './menu';
import { PageContext } from './pageContext';
import ProgressBar from './progressBar';
import useUser from './useUser';
import useWindowSize from './useWindowSize';

interface PageProps {
  children: JSX.Element;
  escapeHref?: string;
  hideUserInfo?: boolean;
  levelOptions?: LevelOptions;
  subtitle?: string;
  title: string;
}

export default function Page({
    children,
    escapeHref,
    hideUserInfo,
    levelOptions,
    subtitle,
    title
}: PageProps) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);

  const [isLoading, setIsLoading] = useState<boolean>();
  const { user, isLoading: isUserLoading } = useUser();
  const windowSize = useWindowSize();

  if (!windowSize) {
    return null;
  }

  return (
    <PageContext.Provider value={{
      isUserLoading: isUserLoading,
      setIsLoading: setIsLoading,
      user: user,
      windowSize: {
        // adjust window size to account for menu
        height: windowSize.height - Dimensions.MenuHeight,
        width: windowSize.width,
      },
    }}>
      <ProgressBar isLoading={isLoading} />
      <Menu
        escapeHref={escapeHref}
        hideUserInfo={hideUserInfo}
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
    </PageContext.Provider>
  );
}
