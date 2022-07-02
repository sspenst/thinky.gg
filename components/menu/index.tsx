import React, { useContext, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import Directory from './directory';
import Dropdown from './dropdown';
import Link from 'next/link';
import LinkInfo from '../../models/linkInfo';
import { PageContext } from '../../contexts/pageContext';
import UserInfo from './userInfo';
import useHasSidebarOption from '../../hooks/useHasSidebarOption';
import useUserConfig from '../../hooks/useUserConfig';

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
  const { mutateUserConfig } = useUserConfig();
  const { setShowSidebar, showSidebar, windowSize } = useContext(PageContext);
  const [userInfoWidth, setUserInfoWidth] = useState(0);

  useEffect(() => {
    // this accounts for a bit more than the home button + dropdown button width
    const buffer = 100;

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
      mutateUserConfig();
    }).catch(err => {
      console.error(err);
    });
  }

  return (
    <div
      className={'select-none shadow-md'}
      style={{
        backgroundColor: 'var(--bg-color-2)',
        borderBottom: '1px solid',
        borderColor: 'var(--bg-color-4)',
        height: Dimensions.MenuHeight,
        position: 'fixed',
        top: 0,
        width: '100%',
        zIndex: 1,
      }}
    >
      <div
        className={'cursor-default'}
        style={{
          float: 'left',
          paddingLeft: Dimensions.MenuPadding * 2,
          paddingRight: Dimensions.MenuPadding,
        }}
      >
        <Link href={'/'} passHref>
          <a
            className={'font-bold text-3xl'}
            style={{
              lineHeight: Dimensions.MenuHeight + 'px',
              width: 20,
            }}
          >
            P
          </a>
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
                <path fillRule='evenodd' d='M14,5 L3,5 L3,19 L14,19 L14,5 Z M16,5 L16,19 L21,19 L21,5 L16,5 Z M2.81818182,3 L21.1818182,3 C22.1859723,3 23,3.8954305 23,5 L23,19 C23,20.1045695 22.1859723,21 21.1818182,21 L2.81818182,21 C1.81402773,21 1,20.1045695 1,19 L1,5 C1,3.8954305 1.81402773,3 2.81818182,3 Z'/>
              </svg>
            </button>
          </div>
        }
        <Dropdown />
      </div>
    </div>
  );
}
