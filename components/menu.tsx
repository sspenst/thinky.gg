import React, { useContext, useEffect, useRef, useState } from 'react';
import Dimensions from '../constants/dimensions';
import Folder from '../models/folder';
import HelpModal from './helpModal';
import Link from 'next/link';
import { WindowSizeContext } from '../contexts/windowSizeContext';
import useUser from '../hooks/useUser';

function FolderDivider() {
  return (
    <div
      className={'cursor-default font-light select-none text-xl'}
      style={{
        color: 'var(--bg-color-4)',
        float: 'left',
        height: Dimensions.MenuHeight,
        lineHeight: Dimensions.MenuHeight + 'px',
        textAlign: 'center',
        verticalAlign: 'middle',
        width: Dimensions.MenuHeight / 2,
      }}
    >
      /
    </div>
  );
}

interface MenuProps {
  folders?: Folder[];
  subtitle?: string;
  title?: string;
}

export default function Menu({ folders, subtitle, title }: MenuProps) {
  const [collapsed, setCollapsed] = useState(false);
  const folderLinks = [];
  const menuLeftRef = useRef<HTMLDivElement>(null);
  const [menuLeftWidth, setMenuLeftWidth] = useState(0);
  const menuRightRef = useRef<HTMLDivElement>(null);
  const [menuRightWidth, setMenuRightWidth] = useState(0);
  const { user, isLoading } = useUser();
  const windowSize = useContext(WindowSizeContext);

  useEffect(() => {
    // NB: need to have this condition to maintain the previous menuLeftWidth when collapsed
    if (menuLeftRef.current && menuLeftRef.current.offsetWidth !== 0) {
      setMenuLeftWidth(menuLeftRef.current.offsetWidth);
    }
  }, [collapsed, folders, subtitle, title]);

  useEffect(() => {
    if (menuRightRef.current) {
      setMenuRightWidth(menuRightRef.current.offsetWidth);
    }
  }, [isLoading, user]);

  useEffect(() => {
    // NB: 50 is a buffer for the home button
    setCollapsed(menuLeftWidth + menuRightWidth + 50 > windowSize.width);
  }, [menuLeftWidth, menuRightWidth, windowSize.width]);

  let escHref = undefined;

  if (folders) {
    for (let i = 0; i < folders.length; i++) {
      folderLinks.push(<FolderDivider key={`${i}-divider`}/>);
      folderLinks.push(
        <div
          className='text-md'
          key={`${i}-folder`}
          style={{
            float: 'left',
            padding: `0 ${Dimensions.MenuPadding}px`,
          }}
        >
          <Link href={folders[i].href} passHref>
            <button
              style={{
                height: Dimensions.MenuHeight,
              }}
            >
              {folders[i].text}
            </button>
          </Link>
        </div>
      );
    }

    escHref = folders[folders.length - 1].href;
  }

  return (
    <div style={{
      backgroundColor: 'var(--bg-color-2)',
      borderBottom: '1px solid',
      borderColor: 'var(--bg-color-4)',
      height: Dimensions.MenuHeight,
      position: 'fixed',
      top: 0,
      width: windowSize.width,
    }}>
      {/* logo home button */}
      <div
        className='cursor-default select-none'
        style={{
          float: 'left',
          paddingLeft: Dimensions.MenuPadding * 2,
          paddingRight: Dimensions.MenuPadding,
        }}
      >
        <Link href={'/'} passHref>
          <button
            className={'font-bold text-3xl'}
            style={{
              height: Dimensions.MenuHeight,
            }}
          >
            P
          </button>
        </Link>
      </div>
      {collapsed ?
      escHref ?
      <>
        <FolderDivider/>
        <div
          className='text-md'
          style={{
            float: 'left',
            padding: `0 ${Dimensions.MenuPadding}px`,
          }}
        >
          <Link href={escHref} passHref>
            <button
              style={{
                height: Dimensions.MenuHeight,
              }}
            >
              Esc
            </button>
          </Link>
        </div>
      </> : null :
      <div
        ref={menuLeftRef}
        style={{
          float: 'left',
        }}
      >
        {/* folder structure */}
        {folderLinks}
        {/* title */}
        <FolderDivider/>
        <div style={{
          float: 'left',
          padding: `0 ${Dimensions.MenuPadding}px`,
        }}>
          <span
            className={'text-lg'}
            style={{
              lineHeight: Dimensions.MenuHeight + 'px',
              verticalAlign: 'middle',
            }}
          >
            {title}
            {!subtitle ? null :
              <>
                {' - '}
                <span className={'italic'}>
                  {subtitle}
                </span>
              </>
            }
          </span>
        </div>
      </div>}
      <div
        ref={menuRightRef}
        style={{
          float: 'right',
        }}
      >
        {/* help button */}
        <div style={{ float: 'right' }}>
          <HelpModal/>
        </div>
        {/* user info */}
        <div style={{
          float: 'right',
          lineHeight: Dimensions.MenuHeight + 'px',
        }}>
          {isLoading ? null : !user ?
            <>
              <div style={{
                float: 'right',
                padding: `0 ${Dimensions.MenuPadding}px`,
              }}>
                <Link href='/signup'>Sign Up</Link>
              </div>
              <div style={{
                float: 'right',
                padding: `0 ${Dimensions.MenuPadding}px`,
              }}>
                <Link href='/login'>Log In</Link>
              </div>
            </>
            :
            <>
              <div style={{
                float: 'right',
                padding: `0 ${Dimensions.MenuPadding}px`,
              }}>
                <Link href='/account' passHref>
                  <button className='font-bold'>
                    {user.name}
                  </button>
                </Link>
              </div>
              <div style={{
                float: 'right',
                padding: `0 ${Dimensions.MenuPadding}px`,
              }}>
                {user.score} <span style={{color: 'var(--color-complete)'}}>✓</span>
              </div>
            </>
          }
        </div>
      </div>
    </div>
  );
}
