import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const folderLinks = [];

  if (folders) {
    for (let i = 0; i < folders.length; i++) {
      folderLinks.push(<FolderDivider key={`divider-${folders[i].text}`} />);
      folderLinks.push(
        <div className='truncate' key={`folder-${folders[i].text}`} style={{ minWidth: 32 }}>
          {folders[i].toElement()}
        </div>
      );
    }
  }

  return (<>
    {/* back button on mobile */}
    <div className='flex gap-2 items-center xl:hidden'>
      <FolderDivider />
      <button className='hover:opacity-70 mr-1' onClick={router.back}>
        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={2} stroke='currentColor' className='w-5 h-5'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18' />
        </svg>
      </button>
      <button className='hover:opacity-70' onClick={router.forward}>
        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={2} stroke='currentColor' className='w-5 h-5'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3' />
        </svg>
      </button>
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
