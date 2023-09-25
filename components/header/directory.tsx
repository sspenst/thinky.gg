import Link from 'next/link';
import React from 'react';
import LinkInfo from '../formatted/linkInfo';

export function FolderDivider() {
  return (
    <div
      className='cursor-default font-light text-xl px-2'
      style={{
        color: 'var(--bg-color-4)',
      }}
    >
      /
    </div>
  );
}

interface DirectoryProps {
  folders?: LinkInfo[];
  subtitle?: LinkInfo;
  title?: LinkInfo;
}

export default function Directory({ folders, subtitle, title }: DirectoryProps) {
  const folderLinks = [];
  let escHref = undefined;

  if (folders) {
    for (let i = 0; i < folders.length; i++) {
      folderLinks.push(<FolderDivider key={`divider-${folders[i].text}`} />);
      folderLinks.push(
        <div className='truncate' key={`folder-${folders[i].text}`} style={{ minWidth: 32 }}>
          {folders[i].toElement()}
        </div>
      );
    }

    escHref = folders[folders.length - 1].href;
  }

  return (<>
    <div className='flex gap-2 items-center xl:hidden'>
      {/* collapsed directory displays an escape link if applicable, otherwise nothing */}
      {escHref &&
        <>
          <FolderDivider />
          <Link className='underline' href={escHref}>
            Esc
          </Link>
        </>
      }
    </div>
    <div className='gap-2 items-center hidden xl:flex truncate'>
      {folderLinks}
      <FolderDivider />
      <h1 className='text-lg align-middle truncate' style={{ minWidth: 32 }}>
        {title?.toElement()}
        {!subtitle ? null :
          <>
            {' - '}
            {subtitle.toElement()}
          </>
        }
      </h1>
    </div>
  </>);
}
