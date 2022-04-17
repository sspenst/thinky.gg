import React, { useEffect, useState } from 'react';
import Dimensions from '../constants/dimensions';
import Level from '../models/db/level';
import LinkInfo from '../models/linkInfo';
import Menu from './menu';
import { PageContext } from '../contexts/pageContext';
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
  const windowSize = useWindowSize();

  if (!windowSize) {
    return null;
  }

  return (
    <div style={{
      color: 'var(--color)',
    }}>
      <PageContext.Provider value={{
        forceUpdate: forceUpdate,
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
        <div style={{
          backgroundColor: 'var(--bg-color)',
          maxHeight: windowSize.height - Dimensions.MenuHeight,
          minWidth: windowSize.width,
          overflowY: 'auto',
          position: 'fixed',
          top: Dimensions.MenuHeight,
          zIndex: -1,
        }}>
          {children}
        </div>
      </PageContext.Provider>
    </div>
  );
}
