import Dimensions from '@root/constants/dimensions';
import { GameId } from '@root/constants/GameId';
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
  href: string;
  game: Game
  id: string;
  levelData: string;
  subtitle?: string;
  title: string | JSX.Element;
}

export function ChapterSelectCardBase({
  complete,
  disabled,
  disabledStr,
  href,
  game,
  id,
  levelData,
  subtitle,
  title,
}: ChapterSelectCardBaseProps) {
  const [backgroundImage, setBackgroundImage] = useState<string>();

  useEffect(() => {
    setBackgroundImage(getPngDataClient(game.id, levelData));
  }, [game.id, levelData]);

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
      <div className='italic -my-3 text-center'>
        {disabledStr}
      </div>
    }
  </>);
}

interface ChapterSelectCardProps {
  titleOverride?: string;
  chapter: number;
  chapterUnlocked?: number;
  href?: string;
}

export default function ChapterSelectCard({ chapter, chapterUnlocked, href, titleOverride }: ChapterSelectCardProps) {
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
        href={href ?? '/chapter1'}
        id='chapter1'
        levelData={'50000000\n00000100\n02000000\n00000020'}
        subtitle={'Grassroots'}
        title={titleOverride || 'Chapter 1'}
      />
    );
  case 2:
    return (
      <ChapterSelectCardBase
        game={game}
        complete={!!chapterUnlocked && chapterUnlocked > 2}
        disabled={chapterUnlocked ? chapterUnlocked < 2 : false}
        disabledStr={'Complete Chapter 1 to unlock Chapter 2!'}
        href={href ?? '/chapter2'}
        id='chapter2'
        levelData={'005E0C00\n0G070005\n10005010\n005100I0'}
        subtitle={'Into the Depths'}
        title={titleOverride || 'Chapter 2'}
      />
    );
  case 3:
    return (
      <ChapterSelectCardBase
        game={game}
        complete={!!chapterUnlocked && chapterUnlocked > 3}
        disabled={chapterUnlocked ? chapterUnlocked < 3 : false}
        disabledStr={'Complete Chapter 2 to unlock Chapter 3!'}
        href={href ?? '/chapter3'}
        id='chapter3'
        levelData={'B519F0G0\n10JH5H52\n75F02J08\n02050B10'}
        subtitle={'Brain Busters'}
        title={titleOverride || 'Chapter 3'}
      />
    );
  case 4:
    return (
      <ChapterSelectCardBase
        game={game}
        disabled={!href}
        href={href ?? '/play'}
        id='chapter4'
        levelData={'65G9F0G5\nGBJ5GH5I\n50FF25DG\nJ5I5H505'}
        subtitle={'Coming soon...'}
        title={titleOverride || 'Chapter 4'}
      />
    );
  default:
    return null;
  }
}
