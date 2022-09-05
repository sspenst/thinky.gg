import classNames from 'classnames';
import { url } from 'inspector';
import Link from 'next/link';
import React from 'react';
import getPngDataClient from '../helpers/getPngDataClient';
import { EnrichedLevel } from '../models/db/level';
import styles from './SelectCard.module.css';

interface LevelDisplayProps {
    level: EnrichedLevel;
    hideName?: boolean;
    hideStats?: boolean;
    hideUser?: boolean;
}

export default function LevelButtonDisplay({ level, hideName, hideStats, hideUser }: LevelDisplayProps): JSX.Element {
  const color = level.userMoves ? (level.userMoves === level.leastMoves ? 'var(--color-complete)' : 'var(--color-incomplete)') : 'var(--color)';
  const width = 200;
  const height = 100;

  return (
    <div className='wrapper rounded-md'
      style={{
        width: width,
        height: height,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div className='background rounded-md'
        style={{
          backgroundImage: `url(${getPngDataClient(level)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          height: height,
          opacity: 0.25,
          position: 'absolute',
          transform: 'scale(1.6)',
          width: width,
        }}
      />

      {level.slug ?
        <Link href={'/level/' + level.slug} passHref prefetch>
          <a
            className={classNames(
              'border-2 rounded-md',
              styles['card-border'],
              { 'text-xl': !level.userMoves },
            )}
            style={{
              alignItems: 'center',
              borderColor: color,
              color: color,
              display: 'flex',
              height: 100,
              justifyContent: 'center',
              textAlign: 'center',
              //textShadow: '1px 1px black',
              width: width,
            }}
          >
            <span
              className={classNames('font-bold break-words', { 'text-sm': level.name.length >= 25 })}
              style={{
                padding: 16,
                width: width,
              }}
            >
              {hideName ?? level.name}
              {!level.userId ? null :
                <>
                  <br />
                  {level.userId.name}
                </>
              }
              {level.points === undefined ? null :
                <>
                  <br />
                  <span className='italic text-sm'>
                      Difficulty: {level.points}
                  </span>
                </>
              }
              <br />
              <span className='italic text-sm'>
                {level.userMoves ?
                  <>
                    {level.userMoves + '/' + level.leastMoves}
                    <br />
                  </>
                  : null}
              </span>
            </span>
          </a>
        </Link>
        :
        <div
          className={'text-xl'}
          style={{
            height: height,
            lineHeight: height + 'px',
            textAlign: 'center',
            verticalAlign: 'middle',
            width: width,
          }}>
          {level.name}
        </div>
      }
    </div>
  );
}
