import React, { useEffect, useRef } from 'react';
import Dimensions from '../../constants/dimensions';
import Link from 'next/link';
import LinkInfo from '../../models/linkInfo';

function FolderDivider() {
  return (
    <div
      className={'cursor-default font-light text-xl'}
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
  folders?: LinkInfo[];
  setWidth: (directoryWidth: number) => void;
  subtitle?: LinkInfo;
  title?: LinkInfo;
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
          {folders[i].toElement()}
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
          <a
            style={{
              lineHeight: Dimensions.MenuHeight + 'px',
            }}
          >
            Esc
          </a>
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
          {title?.toElement()}
          {!subtitle ? null :
            <>
              {' - '}
              {subtitle.toElement()}
            </>
          }
        </span>
      </div>
    </div>
  );
}
