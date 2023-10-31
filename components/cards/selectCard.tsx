import { AppContext } from '@root/contexts/appContext';
import isPro from '@root/helpers/isPro';
import classNames from 'classnames';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import getPngDataClient from '../../helpers/getPngDataClient';
import SelectOption from '../../models/selectOption';
import EditLevelModal from '../modal/editLevelModal';
import { PlayLaterToggleButton } from './playLaterToggleButton';
import styles from './SelectCard.module.css';
import SelectCardContent from './selectCardContent';

interface SelectCardProps {
  option: SelectOption;
  prefetch?: boolean;
}

export default function SelectCard({ option, prefetch }: SelectCardProps) {
  const [backgroundImage, setBackgroundImage] = useState<string>();
  const [isEditLevelModalOpen, setIsEditLevelModalOpen] = useState(false);
  const { myPlayLater, user } = useContext(AppContext);

  useEffect(() => {
    if (option.level) {
      setBackgroundImage(getPngDataClient(option.level.data));
    }
  }, [option.level]);

  const color = option.disabled ? 'var(--bg-color-4)' :
    option.stats?.getColor('var(--color)') ?? 'var(--color)';

  return (
    <div
      className='p-3 overflow-hidden relative inline-block align-middle'
      style={option.customStyle}
      key={`select-card-${option.id}`}
    >
      <div className='wrapper rounded-md overflow-hidden relative'
        style={{
          height: option.height ?? Dimensions.OptionHeight,
          width: option.width ?? Dimensions.OptionWidth,
        }}
      >
        <div
          className='absolute background rounded-md bg-cover bg-center'
          style={{
            backgroundImage: backgroundImage ? 'url("' + backgroundImage + '")' : 'none',
            height: option.height ?? Dimensions.OptionHeight,
            opacity: 0.25,
            transform: 'scale(1.6)',
            width: option.width ?? Dimensions.OptionWidth,
          }}
        />
        {option.href ?
          <Link
            className={classNames(
              'border-2 rounded-md items-center flex justify-center text-center',
              !option.disabled ? styles['card-border'] : undefined,
              { 'text-xl': !option.stats },
            )}
            href={(option.disabled) ? '' : option.href}
            onClick={option.onClick}
            passHref
            prefetch={prefetch}
            style={{
              borderColor: color,
              color: color,
              height: option.height ?? Dimensions.OptionHeight,
              textShadow: '1px 1px black',
              width: option.width ?? Dimensions.OptionWidth,
            }}
          >
            <SelectCardContent option={option} />
          </Link>
          :
          <button
            className={classNames(
              'border-2 rounded-md items-center flex justify-center text-center',
              { 'pointer-events-none': option.disabled },
              !option.disabled ? styles['card-border'] : undefined,
              { 'text-xl': !option.stats },
            )}
            onClick={option.onClick}
            style={{
              borderColor: color,
              color: color,
              height: option.height ?? Dimensions.OptionHeight,
              textShadow: '1px 1px black',
              width: option.width ?? Dimensions.OptionWidth,
            }}
          >
            <SelectCardContent option={option} />
          </button>
        }
        {option.level && !option.hideAddToPlayLaterButton && isPro(user) && myPlayLater &&
          <div className='absolute bottom-2 left-2 h-6'>
            <PlayLaterToggleButton level={option.level} />
          </div>
        }
        {option.level && user && <>
          <button className='absolute bottom-2 right-2 rounded-full hover-bg-4' onClick={() => setIsEditLevelModalOpen(true)}>
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6' style={{ minWidth: 24, minHeight: 24 }}>
              <path strokeLinecap='round' strokeLinejoin='round' d='M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z' />
            </svg>
          </button>
          <EditLevelModal addOnlyMode={true} redirectToLevelAfterEdit={false} isOpen={isEditLevelModalOpen} level={option.level} closeModal={() => setIsEditLevelModalOpen(false)} />
        </>}
      </div>
    </div>
  );
}
