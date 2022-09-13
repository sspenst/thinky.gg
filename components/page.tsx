import classNames from 'classnames';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';
import Dimensions from '../constants/dimensions';
import Theme from '../constants/theme';
import { AppContext } from '../contexts/appContext';
import { PageContext } from '../contexts/pageContext';
import useUserConfig from '../hooks/useUserConfig';
import useWindowSize from '../hooks/useWindowSize';
import LinkInfo from './linkInfo';
import Menu from './menu';

function useForceUpdate() {
  const [value, setState] = useState(true);

  return () => setState(!value);
}

interface PageProps {
  children: JSX.Element;
  folders?: LinkInfo[];
  isFullScreen?: boolean;
  subtitle?: string;
  subtitleHref?: string;
  title?: string;
  titleHref?: string;
}

export default function Page({
  children,
  folders,
  isFullScreen,
  subtitle,
  subtitleHref,
  title,
  titleHref,
}: PageProps) {
  const forceUpdate = useForceUpdate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);
  const [showSidebar, setShowSidebar] = useState(true);
  const { userConfig } = useUserConfig();
  const windowSize = useWindowSize();

  useEffect(() => {
    if (isFullScreen) {
      document.body.classList.add('touch-none');
    } else {
      document.body.classList.remove('touch-none');
    }
  }, [isFullScreen]);

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

    if (Object.values(Theme).includes(userConfig.theme) && !document.body.classList.contains(userConfig.theme)) {
      // need to remove the default theme so we can add the userConfig theme
      document.body.classList.remove(Theme.Modern);
      document.body.classList.add(userConfig.theme);
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
      <div className={classNames({ 'fixed inset-0': isFullScreen })} style={{
        color: 'var(--color)',
      }}>
        <PageContext.Provider value={{
          forceUpdate: forceUpdate,
          isModalOpen: isModalOpen,
          setIsModalOpen: setIsModalOpen,
          setShowSidebar: setShowSidebar,
          showSidebar: showSidebar,
          windowSize: {
            // adjust window size to account for menu
            height: windowSize.height - Dimensions.MenuHeight,
            width: windowSize.width,
          },
        }}>
          <div className='flex flex-col h-full'>
            <Menu
              folders={folders}
              subtitle={subtitle ? new LinkInfo(subtitle, subtitleHref) : undefined}
              title={title ? new LinkInfo(title, titleHref) : undefined}
            />
            <div className='grow' style={{
              backgroundColor: 'var(--bg-color)',
              zIndex: 1,
            }}>
              {children}
            </div>
          </div>
        </PageContext.Provider>
      </div>
    </>
  );
}
