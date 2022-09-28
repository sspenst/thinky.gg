import classNames from 'classnames';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import Dimensions from '../constants/dimensions';
import getPngDataClient from '../helpers/getPngDataClient';
import SelectOption from '../models/selectOption';
import { getFormattedDifficulty } from './difficultyDisplay';
import styles from './SelectCard.module.css';

interface SelectCardProps {
  option: SelectOption;
  prefetch?: boolean;
}

export default function SelectCard({
  option,
  prefetch,
}: SelectCardProps) {
  const [backgroundImage, setBackgroundImage] = useState<string>();

  useEffect(() => {
    if (option.level) {
      setBackgroundImage(getPngDataClient(option.level));
    }
  }, [option.level]);

  const color = option.disabled ? 'var(--bg-color-4)' :
    option.stats?.getColor('var(--color)') ?? 'var(--color)';

  return (
    <div
      className='handle p-4 overflow-hidden'
      key={`select-card-${option.id}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        position: 'relative',
      }}
    >
      <div className='wrapper rounded-md overflow-hidden'
        style={{
          width: Dimensions.OptionWidth,
          height: option.height,
          position: 'relative',
        }}
      >
        <div className='background rounded-md'
          style={{
            backgroundImage: backgroundImage ? 'url("' + backgroundImage + '")' : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: option.height,
            opacity: 0.25,
            position: 'absolute',
            transform: 'scale(1.6)',
            width: Dimensions.OptionWidth,
          }}
        />
        <Link href={(option.disabled) ? '' : option.href} passHref prefetch={prefetch}>
          <a
            className={classNames(
              'border-2 rounded-md',
              { 'pointer-events-none': (option.disabled || option.draggable) },
              !option.disabled ? styles['card-border'] : undefined,
              { 'text-xl': !option.stats },
            )}
            style={{
              alignItems: 'center',
              borderColor: color,
              color: color,
              display: 'flex',
              height: option.height,
              justifyContent: 'center',
              textAlign: 'center',
              textShadow: '1px 1px black',
              width: Dimensions.OptionWidth,
            }}
          >
            <div
              className={classNames('font-bold break-words p-4')}
              style={{
                width: Dimensions.OptionWidth,
              }}
            >
              <div className={classNames(option.text.length >= 20 ? '' : 'text-lg')}>
                {option.text}
              </div>
              <div className='text-sm italic'>
                {option.author && <div className='pb-1'>{option.author}</div>}
                {getFormattedDifficulty(option.level)}
                {option.stats && <div className='pt-1'>{option.stats.getText()}</div>}
              </div>
            </div>
          </a>
        </Link>
      </div>
    </div>
  );
}
