import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { WindowSizeContext } from './WindowSizeContext';
import useWindowSize from './useWindowSize';
import Dimensions from '../Constants/Dimensions';
import Menu from './Menu';
import LevelOptions from '../Models/LevelOptions';

interface PageProps {
  needsAuth: boolean;
  children: JSX.Element;
  escapeHref?: string;
  levelOptions?: LevelOptions;
  title: string | undefined;
}

export default function Page({ needsAuth, children, escapeHref, levelOptions, title }: PageProps) {
  const router = useRouter();
  const [showPage, setShowPage] = useState(false);

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'checkToken', {credentials: 'include'}).then(res => {
      // 200 indicates valid token
      if (res.status === 200) {
        if (!needsAuth) {
          router.push('/');
        } else {
          setShowPage(true);
        }
      } else {
        if (needsAuth) {
          router.push('/login');
        } else {
          setShowPage(true);
        }
      }
    }).catch(err => {
      console.error(err);
      router.push('/login');
    });
  }, []);

  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);

  const windowSize = useWindowSize();

  if (!windowSize || !showPage) {
    return null;
  }

  return (
    <WindowSizeContext.Provider value={{
      // adjust window size to account for menu
      height: windowSize.height - Dimensions.MenuHeight,
      width: windowSize.width,
    }}>
      <Menu
        escapeHref={escapeHref}
        levelOptions={levelOptions}
        title={title}
      />
      <div style={{
        position: 'fixed',
        top: Dimensions.MenuHeight,
      }}>
        {children}
      </div>
    </WindowSizeContext.Provider>
  );
}
