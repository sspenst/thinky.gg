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
    <div className='p-1 rounded-lg select-card flex flex-col gap-2 w-80 max-w-full hover-bg-2 transition' style={{
      width: 240,
    }}>
      <Link
        className={classNames(
          'border border-color-2 background rounded-md bg-cover bg-center w-full',
          { 'text-xl': !option.stats },
        )}
        href={(option.disabled) ? '' : option.href ?? ''}
        onClick={option.onClick}
        passHref
        style={{
          aspectRatio: '40 / 21',
          backgroundImage: backgroundImage ? 'url("' + backgroundImage + '")' : 'none',
          // borderColor: color,
          color: color,
          textShadow: '1px 1px black',
          // height: (option.width ?? Dimensions.OptionWidth) * 21 / 40,
          // width: option.width ?? Dimensions.OptionWidth,
        }}
      />
      <div className='flex gap-3'>
        <Link href={getProfileSlug(user)} passHref>
          <ProfileAvatar user={user} />
        </Link>
        <div className='flex flex-col gap-0.5'>
          <span className='font-bold'>
            {option.level?.name}
          </span>
          <Link
            className='font-medium text-sm hover:underline truncate gray'
            href={getProfileSlug(user)}
            // onClick={onClick}
            passHref
          >
            {user.name}
          </Link>
          {!option.hideStats && option.stats && <div className='italic text-xs'>{option.stats.getText()} steps</div>}
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
    </div>
  );
}
