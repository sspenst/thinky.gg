import React, { useContext } from 'react';
import Dimensions from '../constants/dimensions';
import Folder from '../models/folder';
import HelpModal from './helpModal';
import Link from 'next/link';
import { PageContext } from './pageContext';

function FolderDivider() {
  return (
    <div
      className={'font-light text-xl'}
      style={{
        color: 'var(--bg-color-4)',
        float: 'left',
        height: Dimensions.MenuHeight - 1,
        lineHeight: Dimensions.MenuHeight - 1 + 'px',
        textAlign: 'center',
        verticalAlign: 'middle',
        width: 24,
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

export default function Menu({
    folders,
    subtitle,
    title
  }: MenuProps) {
  const { isUserLoading, user, windowSize } = useContext(PageContext);
  const titlePadding = 8;
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
            padding: `0 ${titlePadding}px`,
          }}
        >
          <Link href={folders[i].href} passHref>
            <button
              style={{
                height: Dimensions.MenuHeight - 1,
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
        style={{
          float: 'left',
          paddingLeft: 16,
          paddingRight: titlePadding,
        }}
      >
        <Link href={'/'} passHref>
          <button
            className={'font-bold text-2xl'}
            style={{
              color: 'var(--level-player)',
              height: Dimensions.MenuHeight - 1,
              // width: Dimensions.MenuHeight,
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
        padding: `0 ${titlePadding}px`,
      }}>
        <span
          style={{
            lineHeight: Dimensions.MenuHeight - 1 + 'px',
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
      {/* user info */}
      <div style={{
        padding: `0 ${titlePadding}px`,
        position: 'fixed',
        right: Dimensions.MenuHeight,
        lineHeight: Dimensions.MenuHeight + 'px',
      }}>
        {isUserLoading ? null : !user ?
          <>
            <span style={{ margin: '0px 16px' }}>
              <Link href='/login'>Log In</Link>
            </span>
            <Link href='/signup'>Sign Up</Link>
          </>
          :
          <>
            <span style={{ margin: '0px 16px' }}>
              {user.score} <span style={{color: 'lightgreen'}}>✓</span>
            </span>
            <Link href='/account'>{user.name}</Link>
          </>
        }
      </div>
      {/* help button */}
      <div style={{
        position: 'fixed',
        right: 0,
      }}>
        <HelpModal/>
      </div>
    </div>
  );
}
