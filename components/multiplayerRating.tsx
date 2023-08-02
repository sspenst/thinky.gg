import React from 'react';
import { getMatchCountFromProfile, getMatchTypeNameFromMatchType, getRatingFromProfile, isProvisional, MUTLIPLAYER_PROVISIONAL_GAME_LIMIT } from '../helpers/multiplayerHelperFunctions';
import MultiplayerProfile from '../models/db/multiplayerProfile';
import { MultiplayerMatchType } from '../models/MultiplayerEnums';
import StyledTooltip from './styledTooltip';

export interface MultiplayerRatingProps {
  hideType?: boolean;
  profile?: MultiplayerProfile;
  record?: { wins: number; losses: number; draws: number };
  type: MultiplayerMatchType;
}

export default function MultiplayerRating({ hideType, profile, record, type }: MultiplayerRatingProps) {
  if (profile && !isProvisional(type, profile) && getRatingFromProfile(profile, type)) {
    return (
      <div className='flex flex-col items-center'>
        {!hideType && <span className='text-xs'>{getMatchTypeNameFromMatchType(type)}</span>}
        <span data-tooltip-id='profile-rating' data-tooltip-content={`Played ${getMatchCountFromProfile(profile, type)} matches`} className='text-xs italic' style={{
          color: 'var(--color-gray)',
        }}>{Math.round(getRatingFromProfile(profile, type))}</span>
        {record && (
          <div className='text-xs'>
          ({record.wins}-{record.draws}-{record.losses})
          </div>
        )}
        <StyledTooltip id='profile-rating' />
      </div>
    );
  } else {
    const matchesRemaining = !profile ? MUTLIPLAYER_PROVISIONAL_GAME_LIMIT : MUTLIPLAYER_PROVISIONAL_GAME_LIMIT - getMatchCountFromProfile(profile, type);

    return (
      <div className='flex flex-col items-center'style={{
        color: 'var(--color-gray)',
      }} >
        {!hideType && <span className={'text-xs match-type-text-' + type}>{getMatchTypeNameFromMatchType(type)}</span>}
        <span data-tooltip-id='unrated' data-tooltip-content={`${matchesRemaining} match${matchesRemaining === 1 ? '' : 'es'} remaining`} className='text-xs italic' style={{

        }}>Unrated</span>
        {record && (
          <div className='text-xs'>
          ({record.wins}-{record.draws}-{record.losses})
          </div>
        )}
        <StyledTooltip id='unrated' />
      </div>
    );
  }
}
