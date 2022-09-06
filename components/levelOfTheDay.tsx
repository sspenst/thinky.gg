import classNames from 'classnames';
import Link from 'next/link';
import React from 'react';
import Dimensions from '../constants/dimensions';
import getPngDataClient from '../helpers/getPngDataClient';
import { EnrichedLevel } from '../models/db/level';
import styles from './SelectCard.module.css';

interface LevelOfTheDayProps {
  level: EnrichedLevel;
}

export default function LevelOfTheDay({ level }: LevelOfTheDayProps): JSX.Element {
  const color = level.userMoves ? (level.userMoves === level.leastMoves ? 'var(--color-complete)' : 'var(--color-incomplete)') : 'var(--color)';

  return (
    <div className='flex justify-center m-4'>
      <div className='flex flex-wrap justify-center rounded-lg border gap-4 px-4 py-3'
        style={{
          backgroundColor: 'var(--bg-color-2)',
          borderColor: 'var(--bg-color-3)',
        }}
      >
        <div className='flex flex-col items-center vertical-center self-center'>
          <span className='text-lg font-bold'>Level of the Day:</span>
          <svg xmlns='http://www.w3.org/2000/svg' fill='currentColor' className='bi bi-calendar-event p-2 h-12 w-12' viewBox='0 0 16 16'>
            <path d='M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z' />
            <path d='M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z' />
          </svg>
        </div>
        <div className='wrapper rounded-md'
          style={{
            width: Dimensions.OptionWidth,
            height: Dimensions.OptionHeight,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div className='background rounded-md'
            style={{
              backgroundImage: `url(${getPngDataClient(level)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              height: Dimensions.OptionHeight,
              opacity: 0.35,
              position: 'absolute',
              transform: 'scale(1.6)',
              width: Dimensions.OptionWidth,
            }}
          />
          <Link href={'/level/' + level.slug} passHref prefetch>
            <a
              className={classNames(
                'border-2 rounded-md',
                styles['card-border'],
              )}
              style={{
                alignItems: 'center',
                borderColor: color,
                color: color,
                display: 'flex',
                height: Dimensions.OptionHeight,
                justifyContent: 'center',
                textAlign: 'center',
                textShadow: color !== 'var(--color)' ? '1px 1px black' : undefined,
                width: Dimensions.OptionWidth,
              }}
            >
              <div
                className={classNames('font-bold break-words p-4', { 'text-sm': level.name.length >= 25 })}
                style={{
                  width: Dimensions.OptionWidth,
                }}
              >
                {level.name}
                {level.userId && <div>{level.userId.name}</div>}
                <div className='italic text-sm pt-1'>
                  <span>{level.userMoves}</span>
                  <span>{'/' + level.leastMoves}</span>
                </div>
              </div>
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
