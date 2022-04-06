import React, { useEffect, useRef } from 'react';
import Dimensions from '../../constants/dimensions';
import Folder from '../../models/folder';
import Link from 'next/link';

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

interface DirectoryProps {
  collapsed: boolean;
  folders?: Folder[];
  setWidth: (directoryWidth: number) => void;
  subtitle?: string;
  title?: string;
}

export default function Directory({ collapsed, folders, setWidth, subtitle, title }: DirectoryProps) {
  const folderLinks = [];
  const ref = useRef<HTMLDivElement>(null);
  let escHref = undefined;

  useEffect(() => {
    // NB: need to have this condition to maintain the previous menuLeftWidth when collapsed
    if (ref.current && ref.current.offsetWidth !== 0) {
      setWidth(ref.current.offsetWidth);
    }
  }, [collapsed, folders, setWidth, subtitle, title]);

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

  // collapsed directory displays an escape link if applicable, otherwise nothing
  if (collapsed) {
    if (!escHref) {
      return null;
    }

    return (<>
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
    </>);
  }

  return (
    <div
      ref={ref}
      style={{
        float: 'left',
      }}
    >
      {folderLinks}
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
    </div>
  );
}