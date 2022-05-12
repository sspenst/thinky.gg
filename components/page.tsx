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
  authorNote?: string;
  children: JSX.Element;
  folders?: LinkInfo[];
  level?: Level;
  subtitle?: string;
  subtitleHref?: string;
  title?: string;
  titleHref?: string;
}

export default function Page({
  authorNote,
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
  const [isModalOpen, setIsModalOpen] = useState(false);
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
        isModalOpen: isModalOpen,
        setIsModalOpen: setIsModalOpen,
        windowSize: {
          // adjust window size to account for menu
          height: windowSize.height - Dimensions.MenuHeight,
          width: windowSize.width,
        },
      }}>
        <Menu
          authorNote={authorNote}
          folders={folders}
          level={level}
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
  );
}
