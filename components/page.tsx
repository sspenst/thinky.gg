import classNames from 'classnames';
import React, { useEffect, useState } from 'react';
import Dimensions from '../constants/dimensions';
import { PageContext } from '../contexts/pageContext';
import Footer from './footer';
import LinkInfo from './linkInfo';
import Menu from './menu';

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

  return (
    <>
      <div className={classNames({ 'fixed inset-0 overflow-hidden': isFullScreen })} style={{
        color: 'var(--color)',
      }}>
        <PageContext.Provider value={{
          preventKeyDownEvent: preventKeyDownEvent,
          setPreventKeyDownEvent: setPreventKeyDownEvent,
        }}>
          <div className='flex flex-col h-full'>
            <Menu
              folders={folders}
              subtitle={subtitle ? new LinkInfo(subtitle, subtitleHref) : undefined}
              title={title ? new LinkInfo(title, titleHref) : undefined}
            />
            <div className='grow' style={{
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
