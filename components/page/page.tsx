import Nav from '@root/components/nav';
import { AppContext } from '@root/contexts/appContext';
import { ScreenSize } from '@root/hooks/useDeviceCheck';
import classNames from 'classnames';
import React, { useContext, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import { PageContext } from '../../contexts/pageContext';
import LinkInfo from '../formatted/linkInfo';
import Header from '../header';
import Footer from './footer';

interface PageProps {
  children: React.ReactNode;
  folders?: LinkInfo[];
  hideFooter?: boolean;
  isFullScreen?: boolean;
  style?: React.CSSProperties;
  subtitle?: string;
  subtitleHref?: string;
  title?: string;
  titleHref?: string;
}

export default function Page({
  children,
  folders,
  hideFooter,
  isFullScreen,
  style,
  subtitle,
  subtitleHref,
  title,
  titleHref,
}: PageProps) {
  const { deviceInfo, showNav } = useContext(AppContext);
  const [preventKeyDownEvent, setPreventKeyDownEvent] = useState(false);
  const [showHeader, setShowHeader] = useState(true);

  const isNavDropdown = deviceInfo.screenSize < ScreenSize.XL || isFullScreen;
  const isNavOnPage = !isNavDropdown && showNav;

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

  return (
    <PageContext.Provider value={{
      preventKeyDownEvent: preventKeyDownEvent,
      setPreventKeyDownEvent: setPreventKeyDownEvent,
      setShowHeader: setShowHeader,
      showHeader: showHeader,
    }}>
      <div
        className={classNames('flex flex-col', { 'fixed inset-0 overflow-hidden': isFullScreen })}
        style={style}
      >
        {showHeader &&
          <Header
            folders={folders}
            isFullScreen={isFullScreen}
            subtitle={subtitle ? new LinkInfo(subtitle, subtitleHref) : undefined}
            title={title ? new LinkInfo(title, titleHref) : undefined}
          />
        }
        <div className='grow flex' style={{
          height: showHeader ? `calc(100% - ${Dimensions.MenuHeight}px)` : '100%',
          marginTop: showHeader ? Dimensions.MenuHeight : 0,
        }}>
          {isNavOnPage && <Nav />}
          <div
            className={classNames('flex flex-col', { 'ml-60': isNavOnPage })}
            style={{
              maxWidth: !isNavOnPage ? '100%' : 'calc(100% - 240px)',
              width: !isNavOnPage ? '100%' : 'calc(100% - 240px)',
            }}
          >
            <main className='grow z-10 h-full'>
              {children}
            </main>
            {!isFullScreen && !hideFooter && <Footer />}
          </div>
        </div>
      </div>
    </PageContext.Provider>
  );
}
