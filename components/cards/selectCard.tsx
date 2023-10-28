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
  const { user, myPlayLater } = useContext(AppContext);
  const [backgroundImage, setBackgroundImage] = useState<string>();
  let addToPlayLaterBtn;
  const [openEditLevelModal, setOpenEditLevelModal] = useState(false);

  if (option.level && !option.hideAddToPlayLaterButton && user && isPro(user) && myPlayLater) {
    addToPlayLaterBtn = option.level &&
    (
      <>
        <div className='absolute bottom-2 left-2'>
          <PlayLaterToggleButton level={option.level} />
        </div>
        <button className='p-1 rounded-lg absolute bottom-2 right-2 pointer hover:bg-gray-400'
          onClick={() => setOpenEditLevelModal(true)}
        >
          <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-three-dots-vertical' viewBox='0 0 16 16'>
            <path d='M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z' />
          </svg>
        </button>
      </>
    );
  }

  useEffect(() => {
    if (option.level && option.level.data) {
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
      {option.level && <EditLevelModal addOnlyMode={true} redirectToLevelAfterEdit={false} isOpen={openEditLevelModal} level={option.level} closeModal={() => setOpenEditLevelModal(false)} />}

      <div className='wrapper rounded-md overflow-hidden relative'
        style={{
          height: option.height ?? Dimensions.OptionHeight,
          width: option.width ?? Dimensions.OptionWidth,
        }}
      >

        { /** in the bottom right corner add a plus icon emoji button */}
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
        {addToPlayLaterBtn}
      </div>

    </div>
  );
}
