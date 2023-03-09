import classNames from 'classnames';
import React, { useEffect, useState } from 'react';
import Dimensions from '../constants/dimensions';
import Theme from '../constants/theme';
import { PageContext } from '../contexts/pageContext';
import isTheme from '../helpers/isTheme';
import useUser from '../hooks/useUser';
import Footer from './footer';
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

  useEffect(() => {
    if (isFullScreen) {
      document.body.classList.add('touch-pinch-zoom');
    } else {
      document.body.classList.remove('touch-pinch-zoom');
    }

    return () => {
      document.body.classList.remove('touch-pinch-zoom');
    };
  }, [isFullScreen]);

  useEffect(() => {
    if (!user?.config) {
      return;
    }

    if (Object.values(Theme).includes(user.config.theme) && !isTheme(user.config.theme)) {
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
        {!isFullScreen && <Footer />}
      </div>
    </>
  );
}
