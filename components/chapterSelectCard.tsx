import classNames from 'classnames';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import getPngDataClient from '../helpers/getPngDataClient';
import styles from './SelectCard.module.css';

interface ChapterSelectCardProps {
  id: string;
  disabled?: boolean;
  disabledStr?: string;
  href: string;
  levelData: string;
  subtitle: string;
  title: string;
}

export default function ChapterSelectCard({
  id,
  disabled,
  disabledStr,
  href,
  levelData,
  subtitle,
  title,
}: ChapterSelectCardProps) {
  const [backgroundImage, setBackgroundImage] = useState<string>();

  useEffect(() => {
    setBackgroundImage(getPngDataClient(levelData));
  }, [levelData]);

  return (<>
    <div className='overflow-hidden relative inline-block align-middle w-100 max-w-full'>
      <div className='wrapper rounded-md overflow-hidden relative h-40 w-full'>
        <div
          className='absolute background rounded-md bg-cover bg-center h-full w-full'
          style={{
            backgroundImage: backgroundImage ? 'url("' + backgroundImage + '")' : 'none',
            opacity: 0.25,
          }}
        />
        <Link
          id={id}
          className={classNames(
            'border-2 rounded-md items-center flex justify-center text-center h-full w-full',
            !disabled ? styles['card-border'] : undefined,
          )}
          href={disabled ? '' : href}
          passHref
          style={{
            borderColor: 'var(--color)',
            color: 'var(--color)',
            textShadow: '1px 1px black',
          }}
        >
          <div className='font-bold break-words p-4 w-full flex flex-col gap-1'>
            <div className='text-3xl'>
              {title}
            </div>
            <div className='text-xl'>
              {subtitle}
            </div>
          </div>
        </Link>
      </div>
    </div>
    {disabled && disabledStr &&
      <div className='italic -my-3 text-center'>
        {disabledStr}
      </div>
    }
  </>);
}
