import { AppContext } from '@root/contexts/appContext';
import getProfileSlug from '@root/helpers/getProfileSlug';
import classNames from 'classnames';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import getPngDataClient from '../../helpers/getPngDataClient';
import SelectOption from '../../models/selectOption';
import FormattedDifficulty from '../formatted/formattedDifficulty';
import FormattedUser from '../formatted/formattedUser';
import SaveLevelToModal from '../modal/saveLevelToModal';
import ProfileAvatar from '../profile/profileAvatar';
import { PlayLaterToggleButton } from './playLaterToggleButton';
import styles from './SelectCard.module.css';
import SelectCardContent from './selectCardContent';

interface SelectCard2Props {
  option: SelectOption;
}

export default function SelectCard2({ option }: SelectCard2Props) {
  const [backgroundImage, setBackgroundImage] = useState<string>();
  const [isSaveLevelToModalOpen, setIsSaveLevelToModalOpen] = useState(false);

  useEffect(() => {
    if (option.level) {
      setBackgroundImage(getPngDataClient(option.level.data));
    }
  }, [option.level]);

  const color = option.disabled ? 'var(--bg-color-4)' :
    option.stats?.getColor('var(--color)') ?? 'var(--color)';

  if (!option.level?.userId) {
    return null;
  }

  const user = option.level.userId;

  return (
    <Link
      className='p-1 pb-2 rounded-lg select-card flex flex-col gap-2 w-60 max-w-full hover-bg-2 transition h-fit'
      href={(option.disabled) ? '' : option.href ?? ''}
      onClick={option.onClick}
      passHref
    >
      <div
        className={classNames(
          'border border-color-3 background rounded-md bg-cover bg-center w-full relative overflow-hidden',
          { 'text-xl': !option.stats },
        )}
        style={{
          aspectRatio: '40 / 21',
          backgroundImage: backgroundImage ? 'url("' + backgroundImage + '")' : 'none',
          // borderColor: color,
          color: color,
          textShadow: '1px 1px black',
          // height: (option.width ?? Dimensions.OptionWidth) * 21 / 40,
          // width: option.width ?? Dimensions.OptionWidth,
        }}
      >
        {!option.hideStats && option.stats &&
          <div className='text-xs absolute bottom-0 right-0 px-1 bg-black'>
            {option.stats.getText()}
          </div>
        }
      </div>
      <div className='flex gap-3'>
        <Link className='h-fit' href={getProfileSlug(user)} passHref>
          <ProfileAvatar user={user} />
        </Link>
        <div className='flex flex-col gap-0.5 overflow-hidden'>
          <span className='font-bold overflow-hidden' style={{
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
          }}>
            {option.level?.name}
          </span>
          <FormattedUser className='font-medium text-sm gray' hideAvatar id='author' size={Dimensions.AvatarSizeSmall} user={user} />
          {/* {!option.hideStats && option.stats && <div className='italic text-xs'>{option.stats.getText()} steps</div>} */}
          <div className='flex text-xs items-center gap-1 pt-0.5'>
            <FormattedDifficulty
              difficultyEstimate={option.level.calc_difficulty_estimate}
              id={option.id}
              uniqueUsers={option.level.calc_playattempts_unique_users_count !== undefined ?
                option.level.calc_playattempts_unique_users_count :
                option.level.calc_playattempts_unique_users.length}
            />
            {/* <span>-</span> */}
          </div>
        </div>
      </div>
    </Link>
  );
}
