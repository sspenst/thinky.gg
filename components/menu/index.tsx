import React, { useContext, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import Directory from './directory';
import Dropdown from './dropdown';
import Link from 'next/link';
import LinkInfo from '../../models/linkInfo';
import { PageContext } from '../../contexts/pageContext';
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
  const [userInfoWidth, setUserInfoWidth] = useState(0);
  const { windowSize } = useContext(PageContext);

  useEffect(() => {
    // this accounts for a bit more than the home button + dropdown button width
    const buffer = 100;

    setCollapsed(directoryWidth + userInfoWidth + buffer > windowSize.width);
  }, [directoryWidth, userInfoWidth, windowSize.width]);

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
        <Dropdown />
      </div>
    </div>
  );
}
