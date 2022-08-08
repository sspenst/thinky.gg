import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';
import Dimensions from '../constants/dimensions';
import Theme from '../constants/theme';
import { AppContext } from '../contexts/appContext';
import { PageContext } from '../contexts/pageContext';
import useUserConfig from '../hooks/useUserConfig';
import useWindowSize from '../hooks/useWindowSize';
import LinkInfo from '../models/linkInfo';
import Menu from './menu';

function useForceUpdate() {
  const [value, setState] = useState(true);

  return () => setState(!value);
}

interface PageProps {
  children: JSX.Element;
  disableInitialSWR?: boolean;
  folders?: LinkInfo[];
  subtitle?: string;
  subtitleHref?: string;
  title?: string;
  titleHref?: string;
}

export default function Page({
  children,
  disableInitialSWR,
  folders,
  subtitle,
  subtitleHref,
  title,
  titleHref,
}: PageProps) {
  const forceUpdate = useForceUpdate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);
  const [shouldAttemptSWR, setShouldAttemptSWR] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const { userConfig } = useUserConfig();
  const windowSize = useWindowSize();

  useEffect(() => {
    const shouldAttemptSWRDefault = window.sessionStorage.getItem('shouldAttemptSWR');

    setShouldAttemptSWR(!disableInitialSWR && shouldAttemptSWRDefault !== 'false');
  }, [disableInitialSWR]);

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

  useEffect(() => {
    if (!userConfig) {
      return;
    }

    setShowSidebar(userConfig.sidebar);

    if (Object.values(Theme).includes(userConfig.theme) && userConfig.theme !== document.body.className) {
      document.body.className = userConfig.theme;
    }
  }, [userConfig]);

  if (!windowSize) {
    return null;
  }

  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <div style={{
        color: 'var(--color)',
      }}>
        <PageContext.Provider value={{
          forceUpdate: forceUpdate,
          isModalOpen: isModalOpen,
          setIsModalOpen: setIsModalOpen,
          setShouldAttemptSWR: setShouldAttemptSWR,
          setShowSidebar: setShowSidebar,
          shouldAttemptSWR: shouldAttemptSWR,
          showSidebar: showSidebar,
          windowSize: {
            // adjust window size to account for menu
            height: windowSize.height - Dimensions.MenuHeight,
            width: windowSize.width,
          },
        }}>
          <Menu
            folders={folders}
            subtitle={subtitle ? new LinkInfo(subtitle, subtitleHref) : undefined}
            title={title ? new LinkInfo(title, titleHref) : undefined}
          />
          <div style={{
            backgroundColor: 'var(--bg-color)',
            paddingTop: Dimensions.MenuHeight,
            zIndex: -1,
          }}>
            {children}
          </div>
        </PageContext.Provider>
      </div>
    </>
  );
}
