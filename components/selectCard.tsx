import classNames from 'classnames';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import Dimensions from '../constants/dimensions';
import getPngDataClient from '../helpers/getPngDataClient';
import SelectOption from '../models/selectOption';
import styles from './SelectCard.module.css';
import SelectCardContent from './selectCardContent';

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
          height: option.height ?? Dimensions.OptionHeight,
          position: 'relative',
        }}
      >
        <div className='background rounded-md'
          style={{
            backgroundImage: backgroundImage ? 'url("' + backgroundImage + '")' : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: option.height ?? Dimensions.OptionHeight,
            opacity: 0.25,
            position: 'absolute',
            transform: 'scale(1.6)',
            width: Dimensions.OptionWidth,
          }}
        />
        {!option.disabled && option.href ?
          <Link
            href={(option.disabled) ? '' : option.href}
            passHref
            prefetch={prefetch}
            className={classNames(
              'border-2 rounded-md',
              styles['card-border'],
              { 'text-xl': !option.stats },
            )}
            onClick={option.onClick}
            style={{
              alignItems: 'center',
              borderColor: color,
              color: color,
              display: 'flex',
              height: option.height ?? Dimensions.OptionHeight,
              justifyContent: 'center',
              textAlign: 'center',
              textShadow: '1px 1px black',
              width: Dimensions.OptionWidth,
            }}>

            <SelectCardContent option={option} />

          </Link>
          :
          <button
            className={classNames(
              'border-2 rounded-md',
              { 'pointer-events-none': option.disabled },
              !option.disabled ? styles['card-border'] : undefined,
              { 'text-xl': !option.stats },
            )}
            onClick={option.onClick}
            style={{
              alignItems: 'center',
              borderColor: color,
              color: color,
              display: 'flex',
              height: option.height ?? Dimensions.OptionHeight,
              justifyContent: 'center',
              textAlign: 'center',
              textShadow: '1px 1px black',
              width: Dimensions.OptionWidth,
            }}
          >
            <SelectCardContent option={option} />
          </button>
        }
      </div>
    </div>
  );
}
