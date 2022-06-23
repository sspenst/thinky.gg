import React, { useContext, useEffect, useState } from 'react';

import { AppContext } from '../contexts/appContext';
import Dimensions from '../constants/dimensions';
import Level from '../models/db/level';
import LinkInfo from '../models/linkInfo';
import Menu from './menu';
import { PageContext } from '../contexts/pageContext';
import { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/router';
import useWindowSize from '../hooks/useWindowSize';

function useForceUpdate() {
  const [value, setState] = useState(true);

  return () => setState(!value);
}

interface PageProps {
  children: JSX.Element;
  folders?: LinkInfo[];
  level?: Level;
  subtitle?: string;
  subtitleHref?: string;
  title?: string;
  titleHref?: string;
}

export default function Page({
  children,
  folders,
  level,
  subtitle,
  subtitleHref,
  title,
  titleHref,
}: PageProps) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);

  const forceUpdate = useForceUpdate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);
  const windowSize = useWindowSize();

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (url.startsWith('/level/')) {
        setIsLoading(true);
      }
    };

    const handleRouteComplete = () => {
      setIsLoading(false);
    };

    router.events.on('routeChangeStart', handleRouteChange);
    router.events.on('routeChangeComplete', handleRouteComplete);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
      router.events.off('routeChangeComplete', handleRouteComplete);
    };
  }, [router.events, setIsLoading]);

  if (!windowSize) {
    return null;
  }

  return (
    <div style={{
      color: 'var(--color)',
    }}>
      <PageContext.Provider value={{
        forceUpdate: forceUpdate,
        isModalOpen: isModalOpen,
        setIsModalOpen: setIsModalOpen,
        windowSize: {
          // adjust window size to account for menu
          height: windowSize.height - Dimensions.MenuHeight,
          width: windowSize.width,
        },
      }}>
        <Menu
          folders={folders}
          level={level}
          subtitle={subtitle ? new LinkInfo(subtitle, subtitleHref) : undefined}
          title={title ? new LinkInfo(title, titleHref) : undefined}
        />
        <Toaster toastOptions={{ duration: 1000 }}/>
        <div style={{
          backgroundColor: 'var(--bg-color)',
          paddingTop: Dimensions.MenuHeight,
          zIndex: -1,
        }}>
          {children}
        </div>
      </PageContext.Provider>
    </div>
  );
}
