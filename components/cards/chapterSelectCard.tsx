import Dimensions from '@root/constants/dimensions';
import { Game } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import classNames from 'classnames';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
import getPngDataClient from '../../helpers/getPngDataClient';
import styles from './SelectCard.module.css';

interface ChapterSelectCardBaseProps {
  complete?: boolean;
  disabled?: boolean;
  disabledStr?: string;
  game: Game;
  href: string;
  id: string;
  levelData: string;
  subtitle?: string;
  title: React.ReactNode;
  compact?: boolean;
  highlight?: boolean;
}

export function ChapterSelectCardBase({
  complete,
  disabled,
  disabledStr,
  game,
  href,
  id,
  levelData,
  subtitle,
  title,
  compact,
  highlight,
}: ChapterSelectCardBaseProps) {
  const [backgroundImage, setBackgroundImage] = useState<string>();

  useEffect(() => {
    setBackgroundImage(getPngDataClient(game.id, levelData));
  }, [game.id, levelData]);

  if (compact) {
    return (<>
      <div className='overflow-hidden relative inline-block align-middle max-w-full' style={{
        width: 280,
      }}>
        <div className='wrapper rounded-md overflow-hidden relative w-full' style={{
          height: Dimensions.OptionHeightSmall,
        }}>
          <div
            className='absolute background rounded-md bg-cover bg-center h-full w-full'
            style={{
              backgroundImage: backgroundImage ? 'url("' + backgroundImage + '")' : 'none',
              opacity: 0.25,
            }}
          />
          <Link
            className={classNames(
              'border-2 rounded-md items-center flex justify-center text-center h-full w-full relative',
              !disabled ? styles['card-border'] : undefined,
              disabled ? 'overflow-hidden cursor-not-allowed pointer-events-none' : '',
            )}
            href={disabled ? '' : href}
            id={id}
            passHref
            style={{
              borderColor: disabled ? 'var(--color-gray)' : complete ? 'var(--color-complete)' : 'var(--color)',
              color: complete ? 'var(--color-complete)' : 'var(--color)',
              textShadow: '1px 1px black',
              animation: highlight ? 'border-pulse 2s ease-in-out infinite' : undefined,
            }}
          >
            {disabled && (
              <>
                {/* Lock overlay */}
                <div className='absolute inset-0 bg-gray-900/60 backdrop-blur-sm' />
                {/* Lock icon */}
                <div className='absolute top-2 right-2 text-gray-400'>
                  <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z' clipRule='evenodd' />
                  </svg>
                </div>
              </>
            )}
            <div className={classNames('font-bold break-words p-3 w-full flex flex-col gap-0.5', disabled ? 'relative z-10' : '')}>
              <div className='text-xl'>
                {title}
              </div>
              {subtitle &&
                <div className='text-sm'>
                  {subtitle}
                </div>
              }
            </div>
          </Link>
        </div>
      </div>
      {disabled && disabledStr &&
        <div className='flex justify-center -my-3'>
          <div className='inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full'>
            <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
              🔒 {disabledStr}
            </span>
          </div>
        </div>
      }
    </>);
  }

  return (<>
    <div className='overflow-hidden relative inline-block align-middle max-w-full' style={{
      width: 360,
    }}>
      <div className='wrapper rounded-md overflow-hidden relative w-full' style={{
        height: Dimensions.OptionHeightLarge,
      }}>
        <div
          className='absolute background rounded-md bg-cover bg-center h-full w-full'
          style={{
            backgroundImage: backgroundImage ? 'url("' + backgroundImage + '")' : 'none',
            opacity: 0.25,
          }}
        />
        <Link
          className={classNames(
            'border-2 rounded-md items-center flex justify-center text-center h-full w-full relative',
            !disabled ? styles['card-border'] : undefined,
            disabled ? 'overflow-hidden cursor-not-allowed pointer-events-none' : '',
          )}
          href={disabled ? '' : href}
          id={id}
          passHref
          style={{
            borderColor: disabled ? 'var(--color-gray)' : complete ? 'var(--color-complete)' : 'var(--color)',
            color: complete ? 'var(--color-complete)' : 'var(--color)',
            textShadow: '1px 1px black',
            animation: highlight ? 'border-pulse 2s ease-in-out infinite' : undefined,
          }}
        >
          {disabled && (
            <>
              {/* Lock overlay */}
              <div className='absolute inset-0 bg-gray-900/60 backdrop-blur-sm' />
              {/* Lock icon */}
              <div className='absolute top-4 right-4 text-gray-400'>
                <svg className='w-6 h-6' fill='currentColor' viewBox='0 0 20 20'>
                  <path fillRule='evenodd' d='M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z' clipRule='evenodd' />
                </svg>
              </div>
            </>
          )}
          <div className={classNames('font-bold break-words p-4 w-full flex flex-col gap-1', disabled ? 'relative z-10' : '')}>
            <div className='text-3xl'>
              {title}
            </div>
            {subtitle &&
              <div className='text-xl'>
                {subtitle}
              </div>
            }
          </div>
        </Link>
      </div>
    </div>
    {disabled && disabledStr &&
      <div className='flex justify-center -my-3'>
        <div className='inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full'>
          <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
            🔒 {disabledStr}
          </span>
        </div>
      </div>
    }
  </>);
}

interface ChapterSelectCardProps {
  chapter: number;
  chapterUnlocked?: number;
  href?: string;
  titleOverride?: string;
  highlight?: boolean;
}

export default function ChapterSelectCard({ chapter, chapterUnlocked, href, titleOverride, highlight }: ChapterSelectCardProps) {
  const { game } = useContext(AppContext);

  switch (chapter) {
  case 0:
    return (
      <ChapterSelectCardBase
        game={game}
        href={href ?? '/tutorial'}
        id='tutorial'
        levelData={'00000000\n00000000\n00000000\n00000000'}
        title={titleOverride || 'Start'}
      />
    );
  case 1:
    return (
      <ChapterSelectCardBase
        game={game}
        complete={!!chapterUnlocked && chapterUnlocked > 1}
        href={href ?? '/chapter/1'}
        id='chapter1'
        levelData={'50000000\n00000100\n02000000\n00000020'}
        subtitle={'Grassroots'}
        title={titleOverride || 'Chapter 1'}
        highlight={highlight}
      />
    );
  case 2:
    return (
      <ChapterSelectCardBase
        complete={!!chapterUnlocked && chapterUnlocked > 2}
        disabled={chapterUnlocked ? chapterUnlocked < 2 : false}
        disabledStr={'Complete Chapter 1 to unlock'}
        game={game}
        href={href ?? '/chapter/2'}
        id='chapter2'
        levelData={'005E0C00\n0G070005\n10005010\n005100I0'}
        subtitle={'Into the Depths'}
        title={titleOverride || 'Chapter 2'}
      />
    );
  case 3:
    return (
      <ChapterSelectCardBase
        complete={!!chapterUnlocked && chapterUnlocked > 3}
        disabled={chapterUnlocked ? chapterUnlocked < 3 : false}
        disabledStr={'Complete Chapter 2 to unlock'}
        game={game}
        href={href ?? '/chapter/3'}
        id='chapter3'
        levelData={'B519F0G0\n10JH5H52\n75F02J08\n02050B10'}
        subtitle={'Brain Busters'}
        title={titleOverride || 'Chapter 3'}
      />
    );
  case 4:
    return (
      <ChapterSelectCardBase
        disabled={false}
        game={game}
        href={'/ranked'}
        id='chapter4'
        levelData={'65G9F3G5\nG1J5GH3I\n53FF251G\nJ1I5H505'}
        subtitle={'Show Your Mastery'}
        title={titleOverride || 'Ranked Levels'}
      />
    );
  default:
    return null;
  }
}
