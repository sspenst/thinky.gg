import { Tab } from '@headlessui/react';
import Image from 'next/image';
import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import Dimensions from '../../../constants/dimensions';
import { AppContext } from '../../../contexts/appContext';
import { LevelContext } from '../../../contexts/levelContext';
import { PageContext } from '../../../contexts/pageContext';
import getFormattedDate from '../../../helpers/getFormattedDate';
import isCurator from '../../../helpers/isCurator';
import { EnrichedLevel } from '../../../models/db/level';
import SelectOptionStats from '../../../models/selectOptionStats';
import { getFormattedDifficulty } from '../../difficultyDisplay';
import formattedAuthorNote from '../../formattedAuthorNote';
import FormattedUser from '../../formattedUser';
import ArchiveLevelModal from '../../modal/archiveLevelModal';
import EditLevelModal from '../../modal/editLevelModal';
import UnpublishLevelModal from '../../modal/unpublishLevelModal';
import LevelInfoPlayTime from './levelInfoPlayTime';
import LevelInfoRecords from './levelInfoRecords';
import LevelInfoSolves from './levelInfoSolves';

interface FormattedLevelInfoProps {
  level: EnrichedLevel;
}

export default function FormattedLevelInfo({ level }: FormattedLevelInfoProps) {
  const [collapsedAuthorNote, setCollapsedAuthorNote] = useState(true);
  const [isArchiveLevelOpen, setIsArchiveLevelOpen] = useState(false);
  const [isEditLevelOpen, setIsEditLevelOpen] = useState(false);
  const [isUnpublishLevelOpen, setIsUnpublishLevelOpen] = useState(false);
  const levelContext = useContext(LevelContext);
  const { setPreventKeyDownEvent } = useContext(PageContext);
  const { user, userConfig } = useContext(AppContext);

  const maxCollapsedAuthorNote = 100;
  const stat = new SelectOptionStats(level.leastMoves, level.userMoves);

  return (<>
    <div className='mb-4 flex flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <div className='font-bold text-2xl'>{level.name}</div>
        <div className='flex gap-2 items-center'>
          <FormattedUser size={Dimensions.AvatarSizeSmall} user={level.userId} />
          <span className='text-sm' style={{
            color: 'var(--color-gray)',
          }}>{getFormattedDate(level.ts)}</span>
        </div>
        <div className='text-sm flex gap-2 items-center'>
          {getFormattedDifficulty(level.calc_difficulty_estimate, level.calc_playattempts_unique_users_count)}
          {!levelContext?.inCampaign &&
            <button
              className='italic underline'
              onClick={() => {
                navigator.clipboard.writeText(level.data);
                toast.success('Copied to clipboard');
              }}
            >
              Copy level data
            </button>
          }
        </div>
      </div>
      {/* User's stats on this level */}
      {level.userMoves && level.userMovesTs && level.userAttempts && (
        <div className='flex flex-col'>
          <div className='flex items-center gap-2'>
            <span className='font-bold' style={{
              color: stat.getColor(),
              textShadow: '1px 1px black',
            }}>
              {stat.getText()}
            </span>
            <span className='text-sm' style={{
              color: 'var(--color-gray)',
            }}>
              {`${getFormattedDate(level.userMovesTs)}${userConfig?.showPlayStats ? `, ${level.userAttempts} attempt${level.userAttempts !== 1 ? 's' : ''}` : ''}`}
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
      {/* Least steps history */}
      <div className='flex flex-col gap-2'>
        <Tab.Group>
          <Tab.List className='flex flex-wrap gap-x-1 items-start rounded text-sm'>
            <Tab className='ui-selected:border-b-2 border-blue-500 focus:outline-none'>
              <div className='mb-1 py-1 px-2 tab rounded'>
                Least Steps
              </div>
            </Tab>
            <Tab className='ui-selected:border-b-2 border-blue-500 focus:outline-none'>
              <div className='mb-1 py-1 px-2 tab rounded flex flex-row items-center gap-2'>
                <Image alt='pro' src='/pro.svg' width='16' height='16' />
                <span>Solves</span>
              </div>
            </Tab>
            <Tab className='ui-selected:border-b-2 border-blue-500 focus:outline-none'>
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
              <LevelInfoSolves />
            </Tab.Panel>
            <Tab.Panel tabIndex={-1}>
              <LevelInfoPlayTime />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
    {/* Archived by */}
    {level.archivedTs && <>
      <div className='m-3' style={{
        backgroundColor: 'var(--bg-color-4)',
        height: 1,
      }} />
      <div className='flex flex-row gap-2 items-center'>
        <span className='font-bold'>Archived by:</span>
        <FormattedUser size={Dimensions.AvatarSizeSmall} user={level.archivedBy} />
        <span className='text-sm' style={{ color: 'var(--color-gray)' }}>
          {getFormattedDate(level.archivedTs)}
        </span>
      </div>
    </>}
    {/* Creator buttons */}
    {(userConfig?.userId === level.userId?._id || isCurator(user)) && <>
      <div className='m-3' style={{
        backgroundColor: 'var(--bg-color-4)',
        height: 1,
      }} />
      {userConfig?.userId !== level.userId?._id &&
        <div className='flex justify-center text-red-500 font-semibold mb-1'>
          Curator Controls:
        </div>
      }
      <div className='flex flex-row flex-wrap gap-x-4 gap-y-2 items-center justify-center'>
        <button
          className='italic underline'
          onClick={() => {
            setIsEditLevelOpen(true);
            setPreventKeyDownEvent(true);
          }}
        >
          Edit
        </button>
        <button
          className='italic underline'
          onClick={() => {
            setIsArchiveLevelOpen(true);
            setPreventKeyDownEvent(true);
          }}
        >
          Archive
        </button>
        <button
          className='italic underline'
          onClick={() => {
            setIsUnpublishLevelOpen(true);
            setPreventKeyDownEvent(true);
          }}
        >
          Unpublish
        </button>
      </div>
      <EditLevelModal
        closeModal={() => {
          setIsEditLevelOpen(false);
          setPreventKeyDownEvent(false);
          levelContext?.mutateLevel();
        }}
        isOpen={isEditLevelOpen}
        level={level}
      />
      <ArchiveLevelModal
        closeModal={() => {
          setIsArchiveLevelOpen(false);
          setPreventKeyDownEvent(false);
        }}
        isOpen={isArchiveLevelOpen}
        level={level}
      />
      <UnpublishLevelModal
        closeModal={() => {
          setIsUnpublishLevelOpen(false);
          setPreventKeyDownEvent(false);
        }}
        isOpen={isUnpublishLevelOpen}
        level={level}
      />
    </>}
  </>);
}
