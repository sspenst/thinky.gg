import { AppContext } from '@root/contexts/appContext';
import classNames from 'classnames';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import getPngDataClient from '../../helpers/getPngDataClient';
import SelectOption from '../../models/selectOption';
import SaveLevelToModal from '../modal/saveLevelToModal';
import StyledTooltip from '../page/styledTooltip';
import { PlayLaterToggleButton } from './playLaterToggleButton';
import styles from './SelectCard.module.css';
import SelectCardContent from './selectCardContent';

interface SelectCardProps {
  option: SelectOption;
  prefetch?: boolean;
}

export default function SelectCard({ option, prefetch }: SelectCardProps) {
  const [backgroundImage, setBackgroundImage] = useState<string>();
  const [isSaveLevelToModalOpen, setIsSaveLevelToModalOpen] = useState(false);
  const { user } = useContext(AppContext);

  useEffect(() => {
    if (option.level && option.level.data) {
      setBackgroundImage(getPngDataClient(option.level.data));
    }
  }, [option.level]);

  const color = option.disabled ? 'var(--bg-color-4)' :
    option.stats?.getColor('var(--color)') ?? 'var(--color)';
  const tooltipId = `save-level-to-${option.id}`;

  return (
    <div
      className='p-3 overflow-hidden relative inline-block align-middle select-card max-w-full'
      key={`select-card-${option.id}`}
    >
      <div className='wrapper rounded-md overflow-hidden relative max-w-full'
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
              'border-2 rounded-md items-center flex justify-center text-center max-w-full',
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
        {option.level?.isRanked && <>
          <Link
            className='absolute top-0.5 left-0.5 text-yellow-500 p-1'
            data-tooltip-content='Ranked Level'
            data-tooltip-id={`ranked-tooltip-${option.id}`}
            href='/ranked'
          >
            🏅
          </Link>
          <StyledTooltip id={`ranked-tooltip-${option.id}`} />
        </>}
        {option.level && user && <>
          <PlayLaterToggleButton className='absolute bottom-2 left-2 h-6 select-card-button' id={option.id} level={option.level} />
          <button
            className='absolute bottom-2 right-2 select-card-button'
            data-tooltip-content='Save Level To...'
            data-tooltip-id={tooltipId}
            onClick={() => setIsSaveLevelToModalOpen(true)}
          >
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6' style={{ minWidth: 24, minHeight: 24 }}>
              <path strokeLinecap='round' strokeLinejoin='round' d='M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z' />
            </svg>
          </button>
          <StyledTooltip id={tooltipId} />
          <SaveLevelToModal
            closeModal={() => setIsSaveLevelToModalOpen(false)}
            isOpen={isSaveLevelToModalOpen}
            level={option.level}
          />
        </>}
      </div>
    </div>
  );
}
