import classNames from 'classnames';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';
import Dimensions from '../constants/dimensions';
import Theme from '../constants/theme';
import { AppContext } from '../contexts/appContext';
import { PageContext } from '../contexts/pageContext';
import useUser from '../hooks/useUser';
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
  const { isLoading, mutateUser, user } = useUser();
  const [preventKeyDownEvent, setPreventKeyDownEvent] = useState(false);
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);

  useEffect(() => {
    if (isFullScreen) {
      document.body.classList.add('touch-none');
    } else {
      document.body.classList.remove('touch-none');
    }

    return () => {
      document.body.classList.remove('touch-none');
    };
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
    if (!user?.config) {
      return;
    }

    if (Object.values(Theme).includes(user.config.theme) && !document.body.classList.contains(user.config.theme)) {
      // need to remove the default theme so we can add the userConfig theme
      document.body.classList.remove(Theme.Modern);
      document.body.classList.add(user.config.theme);
      forceUpdate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <>
      <div className={classNames({ 'fixed inset-0 overflow-hidden': isFullScreen })} style={{
        color: 'var(--color)',
      }}>
        <PageContext.Provider value={{
          forceUpdate: forceUpdate,
          mutateUser: mutateUser,
          preventKeyDownEvent: preventKeyDownEvent,
          setPreventKeyDownEvent: setPreventKeyDownEvent,
          user: user,
          userConfig: user?.config,
          userLoading: isLoading,
        }}>
          <div className='flex flex-col h-full'>
            <Menu
              folders={folders}
              subtitle={subtitle ? new LinkInfo(subtitle, subtitleHref) : undefined}
              title={title ? new LinkInfo(title, titleHref) : undefined}
            />
            <div className='grow z-10' style={{
              backgroundColor: 'var(--bg-color)',
              height: `calc(100% - ${Dimensions.MenuHeight}px)`,
            }}>
              {children}
            </div>
          </div>
        </PageContext.Provider>
      </div>
    </>
  );
}
