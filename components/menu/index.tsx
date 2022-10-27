import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import { PageContext } from '../../contexts/pageContext';
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
  const [userInfoWidth, setUserInfoWidth] = useState(0);
  const { windowSize } = useContext(PageContext);

  useEffect(() => {
    // this accounts for a bit more than the home button + dropdown button width
    const buffer = 110;

    setCollapsed(directoryWidth + userInfoWidth + buffer > windowSize.width);
  }, [directoryWidth, userInfoWidth, windowSize.width]);

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
        <Dropdown />
      </div>
    </div>
  );
}
