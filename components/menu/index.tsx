import Link from 'next/link';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import { PageContext } from '../../contexts/pageContext';
import useHasSidebarOption from '../../hooks/useHasSidebarOption';
import LinkInfo from '../linkInfo';
import Directory from './directory';
import Dropdown from './dropdown';
import UserInfo from './userInfo';

interface MenuProps {
  folders?: LinkInfo[];
  subtitle?: LinkInfo;
  title?: LinkInfo;
}

export default function Menu({
  folders,
  subtitle,
  title,
}: MenuProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [directoryWidth, setDirectoryWidth] = useState(0);
  const hasSidebarOption = useHasSidebarOption();
  const { mutateUser } = useContext(AppContext);
  const { setShowSidebar, showSidebar, windowSize } = useContext(PageContext);
  const [userInfoWidth, setUserInfoWidth] = useState(0);

  useEffect(() => {
    // this accounts for a bit more than the home button + dropdown button width
    const buffer = 110;

    setCollapsed(directoryWidth + userInfoWidth + buffer > windowSize.width);
  }, [directoryWidth, userInfoWidth, windowSize.width]);

  function putSidebar(sidebar: boolean) {
    fetch('/api/user-config', {
      method: 'PUT',
      body: JSON.stringify({
        sidebar: sidebar,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(() => {
      mutateUser();
    }).catch(err => {
      console.error(err);
    });
  }

  const [background, setBackground] = useState('var(--bg-color-2)');

  useEffect(() => {
    setBackground(window.location.hostname !== 'pathology.gg' ?
      'linear-gradient(45deg, darkred 20%, var(--bg-color-4) 20%, var(--bg-color-4) 40%, var(--bg-color-2) 40%, var(--bg-color-2) 60%, var(--bg-color-4) 60%, var(--bg-color-4) 80%, var(--bg-color-2) 80%, var(--bg-color-2) 100%'
      : 'var(--bg-color-2)');
  }, []);

  return (
    <div
      className={'select-none shadow-md'}
      style={{
        background: background,
        borderBottom: '1px solid',
        borderColor: 'var(--bg-color-4)',
        height: Dimensions.MenuHeight,
        width: '100%',
        zIndex: 2,
      }}
    >
      <div
        className={'cursor-default'}
        style={{
          alignItems: 'center',
          display: 'flex',
          float: 'left',
          height: Dimensions.MenuHeight,
          paddingLeft: Dimensions.MenuPadding * 2,
          paddingRight: Dimensions.MenuPadding,
        }}
      >
        <Link
          className={'font-bold text-3xl'}
          href={'/'}
          passHref
          style={{
            lineHeight: Dimensions.MenuHeight + 'px',
          }}
        >
          <svg xmlns='http://www.w3.org/2000/svg' version='1.1' className='h-6 w-6' viewBox='0 0 32 32'>
            <rect x='1' y='1' fill='var(--level-player)' width='14' height='14' />
            <rect x='17' y='1' fill='var(--level-grid)' width='14' height='14' />
            <rect x='17' y='17' fill='var(--level-grid)' width='14' height='14' />
            <rect x='1' y='17' fill='var(--level-grid)' width='14' height='14' />
          </svg>
        </Link>
      </div>
      <Directory
        collapsed={collapsed}
        folders={folders}
        setWidth={setDirectoryWidth}
        subtitle={subtitle}
        title={title}
      />
      <div
        style={{
          float: 'right',
        }}
      >
        <UserInfo setWidth={setUserInfoWidth} />
        {!hasSidebarOption ? null :
          <div
            style={{
              float: 'left',
              paddingLeft: Dimensions.MenuPadding,
              paddingRight: Dimensions.MenuPadding,
            }}
          >
            <button
              onClick={() => {
                putSidebar(!showSidebar);
                setShowSidebar(prevShowSidebar => !prevShowSidebar);
              }}
              style={{
                height: Dimensions.MenuHeight,
                width: 20,
              }}
            >
              <svg className='h-5 w-5' fill='currentColor' width='24px' height='24px' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
                <path fillRule='evenodd' d='M14,5 L3,5 L3,19 L14,19 L14,5 Z M16,5 L16,19 L21,19 L21,5 L16,5 Z M2.81818182,3 L21.1818182,3 C22.1859723,3 23,3.8954305 23,5 L23,19 C23,20.1045695 22.1859723,21 21.1818182,21 L2.81818182,21 C1.81402773,21 1,20.1045695 1,19 L1,5 C1,3.8954305 1.81402773,3 2.81818182,3 Z' />
              </svg>
            </button>
          </div>
        }
        <Dropdown />
      </div>
    </div>
  );
}
