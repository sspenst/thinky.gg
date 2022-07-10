import React, { useContext, useEffect, useState } from 'react';

import { AppContext } from '../contexts/appContext';
import Dimensions from '../constants/dimensions';
import Head from 'next/head';
import LinkInfo from '../models/linkInfo';
import Menu from './menu';
import { PageContext } from '../contexts/pageContext';
import Theme from '../constants/theme';
import { useRouter } from 'next/router';
import useUserConfig from '../hooks/useUserConfig';
import useWindowSize from '../hooks/useWindowSize';

function useForceUpdate() {
  const [value, setState] = useState(true);

  return () => setState(!value);
}

interface PageProps {
  children: JSX.Element;
  folders?: LinkInfo[];
  subtitle?: string;
  subtitleHref?: string;
  title?: string;
  titleHref?: string;
}

export default function Page({
  children,
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
  const [showSidebar, setShowSidebar] = useState(true);
  const { userConfig } = useUserConfig();
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
          setShowSidebar: setShowSidebar,
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
      <div className='footer'>
        <footer className="p-4 bg-white rounded-lg shadow md:flex md:items-center md:justify-between md:p-6 dark:bg-gray-800">
          <span className="text-sm text-gray-500 sm:text-center dark:text-gray-400">© 2005-2022 <a href="https://k2xl.com/" className="hover:underline"></a>
          </span>
          <ul className="flex flex-wrap items-center mt-3 text-sm text-gray-500 dark:text-gray-400 sm:mt-0">

            <li>
              <a href="https://k2xl.com/privacy_policy" className="mr-4 hover:underline md:mr-6">Privacy Policy</a>
            </li>
            <li>
              <a href="https://docs.google.com/forms/d/e/1FAIpQLSdUWWfDYTzHGJs2YGkFIRogR1cu_EXOPi-TCezpoQ-Iid9FBg/viewform?usp=sf_link" className="hover:underline">Contact</a>
            </li>
          </ul>
        </footer>
      </div>
    </>
  );
}
