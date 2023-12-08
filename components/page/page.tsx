import classNames from 'classnames';
import React, { useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import { PageContext } from '../../contexts/pageContext';
import LinkInfo from '../formatted/linkInfo';
import Header from '../header';
import Footer from './footer';

interface PageProps {
  style?: React.CSSProperties;
  children: React.ReactNode;
  folders?: LinkInfo[];
  hideFooter?: boolean;
  isFullScreen?: boolean;
  subtitle?: string;
  subtitleHref?: string;
  title?: string;
  titleHref?: string;
}

export default function Page({
  style,
  children,
  folders,
  hideFooter,
  isFullScreen,
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
      <div className={classNames('flex flex-col', { 'fixed inset-0 overflow-hidden': isFullScreen })}
        style={style}>
        {showHeader &&
          <Header
            folders={folders}
            subtitle={subtitle ? new LinkInfo(subtitle, subtitleHref) : undefined}
            title={title ? new LinkInfo(title, titleHref) : undefined}
          />
        }
        <main className='grow z-10' style={{
          height: showHeader ? `calc(100% - ${Dimensions.MenuHeight}px)` : '100%',
        }}>
          {children}
        </main>
      </div>
      {!isFullScreen && !hideFooter && <Footer />}
    </PageContext.Provider>
  );
}
