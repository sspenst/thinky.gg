import classNames from 'classnames';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import getPngDataClient from '../../helpers/getPngDataClient';
import styles from './SelectCard.module.css';

interface ChapterSelectCardBaseProps {
  complete?: boolean;
  disabled?: boolean;
  disabledStr?: string;
  href: string;
  id: string;
  levelData: string;
  subtitle: string;
  title: string;
}

function ChapterSelectCardBase({
  complete,
  disabled,
  disabledStr,
  href,
  id,
  levelData,
  subtitle,
  title,
}: ChapterSelectCardBaseProps) {
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
          className={classNames(
            'border-2 rounded-md items-center flex justify-center text-center h-full w-full',
            !disabled ? styles['card-border'] : undefined,
          )}
          href={disabled ? '' : href}
          id={id}
          passHref
          style={{
            borderColor: disabled ? 'var(--color-gray)' : complete ? 'var(--color-complete)' : 'var(--color)',
            color: complete ? 'var(--color-complete)' : 'var(--color)',
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

interface ChapterSelectCardProps {
  chapter: number;
  chapterUnlocked?: number;
  href?: string;
}

export default function ChapterSelectCard({ chapter, chapterUnlocked, href }: ChapterSelectCardProps) {
  switch (chapter) {
  case 1:
    return (
      <ChapterSelectCardBase
        complete={!!chapterUnlocked && chapterUnlocked > 1}
        href={href ?? '/chapter1'}
        id='chapter1'
        levelData={'00000000\n00000000\n00000000\n00000000'}
        subtitle={'Grassroots'}
        title={'Chapter 1'}
      />
    );
  case 2:
    return (
      <ChapterSelectCardBase
        complete={!!chapterUnlocked && chapterUnlocked > 2}
        disabled={chapterUnlocked ? chapterUnlocked < 2 : false}
        disabledStr={'Complete Chapter 1 to unlock Chapter 2!'}
        href={href ?? '/chapter2'}
        id='chapter2'
        levelData={'005E0C00\n0G070005\n10005010\n005100I0'}
        subtitle={'Into the Depths'}
        title={'Chapter 2'}
      />
    );
  case 3:
    return (
      <ChapterSelectCardBase
        complete={!!chapterUnlocked && chapterUnlocked > 3}
        disabled={chapterUnlocked ? chapterUnlocked < 3 : false}
        disabledStr={'Complete Chapter 2 to unlock Chapter 3!'}
        href={href ?? '/chapter3'}
        id='chapter3'
        levelData={'B519F0G0\n10JH5H52\n75F02J08\n02050B10'}
        subtitle={'Brain Busters'}
        title={'Chapter 3'}
      />
    );
  case 4:
    return (
      <ChapterSelectCardBase
        disabled={!href}
        href={href ?? '/play'}
        id='chapter4'
        levelData={'65G9F0G5\nGBJ5GH5I\n50FF25DG\nJ5I5H505'}
        subtitle={'Coming soon...'}
        title={'Chapter 4'}
      />
    );
  default:
    return null;
  }
}
