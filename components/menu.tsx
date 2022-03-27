import React, { useContext } from 'react';
import Dimensions from '../constants/dimensions';
import Folder from '../models/folder';
import HelpModal from './helpModal';
import Link from 'next/link';
import { PageContext } from './pageContext';

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
  const { isUserLoading, user, windowSize } = useContext(PageContext);
  const folderLinks = [];

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
              color: 'var(--level-player)',
              height: Dimensions.MenuHeight,
            }}
          >
            P
          </button>
        </Link>
      </div>
      {/* folder structure */}
      {folderLinks}
      {/* title */}
      <FolderDivider/>
      <div style={{
        float: 'left',
        padding: `0 ${Dimensions.MenuPadding}px`,
      }}>
        <span
          style={{
            lineHeight: Dimensions.MenuHeight + 'px',
            verticalAlign: 'middle',
          }}
          className={'text-lg'}
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
      {/* help button */}
      <div style={{ float: 'right' }}>
        <HelpModal/>
      </div>
      {/* user info */}
      <div style={{
        float: 'right',
        lineHeight: Dimensions.MenuHeight + 'px',
      }}>
        {isUserLoading ? null : !user ?
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
              {user.score} <span style={{color: 'lightgreen'}}>✓</span>
            </div>
          </>
        }
      </div>
    </div>
  );
}
