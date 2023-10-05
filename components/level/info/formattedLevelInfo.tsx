import { Tab } from '@headlessui/react';
import FormattedDate from '@root/components/formatted/formattedDate';
import Solved from '@root/components/level/info/solved';
import FormattedLevelReviews from '@root/components/level/reviews/formattedLevelReviews';
import Image from 'next/image';
import React, { useContext, useState } from 'react';
import Dimensions from '../../../constants/dimensions';
import { AppContext } from '../../../contexts/appContext';
import { EnrichedLevel } from '../../../models/db/level';
import SelectOptionStats from '../../../models/selectOptionStats';
import formattedAuthorNote from '../../formatted/formattedAuthorNote';
import FormattedDifficulty from '../../formatted/formattedDifficulty';
import FormattedUser from '../../formatted/formattedUser';
import LevelDropdown from './levelDropdown';
import LevelInfoCompletions from './levelInfoCompletions';
import LevelInfoPlayTime from './levelInfoPlayTime';
import LevelInfoRecords from './levelInfoRecords';

interface FormattedLevelInfoProps {
  level: EnrichedLevel;
}

export default function FormattedLevelInfo({ level }: FormattedLevelInfoProps) {
  const [collapsedAuthorNote, setCollapsedAuthorNote] = useState(true);
  const { userConfig } = useContext(AppContext);

  const maxCollapsedAuthorNote = 100;
  const stat = new SelectOptionStats(level.leastMoves, level.userMoves);

  return (<>
    <div className='mb-4 flex flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <div className='flex justify-between w-full items-start'>
          <div className='font-bold text-2xl'>{level.name}</div>
          <LevelDropdown level={level} />
        </div>
        <div className='flex gap-2 items-center'>
          <FormattedUser id='author' size={Dimensions.AvatarSizeSmall} user={level.userId} />
          <FormattedDate ts={level.ts} />
        </div>
        <div className='text-sm flex pt-0.5'>
          <FormattedDifficulty difficultyEstimate={level.calc_difficulty_estimate} id={level._id.toString()} uniqueUsers={level.calc_playattempts_unique_users_count} />
        </div>
      </div>
      {/* User's stats on this level */}
      {level.userMoves && level.userMovesTs && level.userAttempts && (
        <div className='flex flex-col'>
          <div className='flex items-center gap-2 flex-wrap'>
            <span className='font-bold' style={{
              color: stat.getColor(),
              textShadow: '1px 1px black',
            }}>
              {stat.getText()}
            </span>
            {stat.isSolved() && <Solved className='-mx-2' />}
            <span className='flex'>
              <FormattedDate ts={level.userMovesTs} />
              {userConfig?.showPlayStats &&
                <span className='text-sm' style={{
                  color: 'var(--color-gray)',
                }}>
                  {`, ${level.userAttempts} attempt${level.userAttempts !== 1 ? 's' : ''}`}
                </span>
              }
            </span>
          </div>
        </div>
      )}
      {/* Author note */}
      {!level.authorNote ? null :
        <>
          <div className='flex flex-col'>
            {formattedAuthorNote(level.authorNote.length > maxCollapsedAuthorNote && collapsedAuthorNote ? `${level.authorNote.slice(0, maxCollapsedAuthorNote)}...` : level.authorNote)}
            {level.authorNote.length <= maxCollapsedAuthorNote ? null :
              <button
                className='italic underline w-fit mt-1 text-sm'
                onClick={() => setCollapsedAuthorNote(c => !c)}
              >
                {`Show ${collapsedAuthorNote ? 'more' : 'less'}`}
              </button>
            }
          </div>
        </>
      }
      {/* Archived by */}
      {level.archivedTs && <>
        <div className='flex flex-row gap-2 items-center'>
          <span className='font-medium whitespace-nowrap'>Archived by:</span>
          <FormattedUser id='archived-by' size={Dimensions.AvatarSizeSmall} user={level.archivedBy} />
          <FormattedDate ts={level.archivedTs} />
        </div>
      </>}
      {/* Least steps history */}
      <div className='flex flex-col gap-2'>
        <Tab.Group>
          <Tab.List className='flex flex-wrap gap-x-1 items-start rounded text-sm'>
            <Tab id='leastStepsTab' className='ui-selected:border-b-2 border-blue-500 focus:outline-none' onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
              }
            }}>
              <div className='mb-1 py-1 px-2 tab rounded'>
                Least Steps
              </div>
            </Tab>
            <Tab id='completionsTab' className='ui-selected:border-b-2 border-blue-500 focus:outline-none' onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
              }
            }}>
              <div className='mb-1 py-1 px-2 tab rounded'>
                Completions
              </div>
            </Tab>
            <Tab id='timePlayedTab' className='ui-selected:border-b-2 border-blue-500 focus:outline-none' onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
              }
            }}>
              <div className='mb-1 py-1 px-2 tab rounded flex flex-row items-center gap-2'>
                <Image alt='pro' src='/pro.svg' width='16' height='16' />
                <span>Time Played</span>
              </div>
            </Tab>
          </Tab.List>
          <Tab.Panels>
            <Tab.Panel tabIndex={-1}>
              <LevelInfoRecords />
            </Tab.Panel>
            <Tab.Panel tabIndex={-1}>
              <LevelInfoCompletions />
            </Tab.Panel>
            <Tab.Panel tabIndex={-1}>
              <LevelInfoPlayTime />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
    {/* Reviews */}
    <div className='m-3 opacity-30' style={{
      backgroundColor: 'var(--bg-color-4)',
      height: 1,
    }} />
    <FormattedLevelReviews />
  </>);
}
