import Nav from '@root/pages/[subdomain]/home/nav';
import classNames from 'classnames';
import React, { useEffect, useState } from 'react';
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
  const [preventKeyDownEvent, setPreventKeyDownEvent] = useState(false);
  const [showHeader, setShowHeader] = useState(true);

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
      setShowHeader: setShowHeader,
      setPreventKeyDownEvent: setPreventKeyDownEvent,
      showHeader: showHeader,
    }}>
      <div
        className={classNames('flex flex-col', { 'fixed inset-0 overflow-hidden': isFullScreen })}
        style={style}
      >
        {showHeader &&
          <Header
            folders={folders}
            subtitle={subtitle ? new LinkInfo(subtitle, subtitleHref) : undefined}
            title={title ? new LinkInfo(title, titleHref) : undefined}
          />
        }
        <div className='grow flex' style={{
          height: showHeader ? `calc(100% - ${Dimensions.MenuHeight}px)` : '100%',
          marginTop: showHeader ? Dimensions.MenuHeight : 0,
        }}>
          {!isFullScreen && <Nav />}
          <div className={classNames('w-full flex flex-col', { 'ml-60': !isFullScreen })}>
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
