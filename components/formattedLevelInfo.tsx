import { Tab } from '@headlessui/react';
import Image from 'next/image';
import Link from 'next/link';
import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import Dimensions from '../constants/dimensions';
import ProStatsLevelType from '../constants/proStatsLevelType';
import { AppContext } from '../contexts/appContext';
import { LevelContext } from '../contexts/levelContext';
import { PageContext } from '../contexts/pageContext';
import getFormattedDate from '../helpers/getFormattedDate';
import isCurator from '../helpers/isCurator';
import isPro from '../helpers/isPro';
import { EnrichedLevel } from '../models/db/level';
import SelectOptionStats from '../models/selectOptionStats';
import { getFormattedDifficulty } from './difficultyDisplay';
import formattedAuthorNote from './formattedAuthorNote';
import FormattedUser from './formattedUser';
import ArchiveLevelModal from './modal/archiveLevelModal';
import EditLevelModal from './modal/editLevelModal';
import UnpublishLevelModal from './modal/unpublishLevelModal';
import { dynamicDurationDisplay, ProLevelPlayTimeAnalytics } from './pro-account/pro-level-playtime-analytics';
import ProLevelStepBucketAnalytics from './pro-account/pro-level-stepbucket-analytics';

interface FormattedLevelInfoProps {
  level: EnrichedLevel;
}

export default function FormattedLevelInfo({ level }: FormattedLevelInfoProps) {
  const [collapsedAuthorNote, setCollapsedAuthorNote] = useState(true);
  const [hideStats, setHideStats] = useState(true);
  const [isArchiveLevelOpen, setIsArchiveLevelOpen] = useState(false);
  const [isEditLevelOpen, setIsEditLevelOpen] = useState(false);
  const [isUnpublishLevelOpen, setIsUnpublishLevelOpen] = useState(false);
  const levelContext = useContext(LevelContext);
  const { setPreventKeyDownEvent } = useContext(PageContext);
  const { user, userConfig } = useContext(AppContext);

  const maxCollapsedAuthorNote = 100;
  const recordDivs = [];
  const stat = new SelectOptionStats(level.leastMoves, level.userMoves);

  if (levelContext?.records && levelContext.records.length > 0) {
    for (let i = 0; i < (hideStats ? 1 : levelContext.records.length); i++) {
      const record = levelContext.records[i];

      recordDivs.push(
        <div
          className='flex gap-1.5 items-center'
          key={`record-${record._id}`}
        >
          <span className='font-bold w-11 text-right'>{record.moves}</span>
          <FormattedUser size={Dimensions.AvatarSizeSmall} user={record.userId} />
          <span className='text-sm' style={{
            color: 'var(--color-gray)',
          }}>{getFormattedDate(record.ts)}</span>
        </div>
      );
    }
  }

  const prostats = levelContext?.prostats;

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
              <div className='flex flex-row gap-2'>
                <span>{`${getFormattedDate(level.userMovesTs)}${userConfig?.showPlayStats ? `, ${level.userAttempts} attempt${level.userAttempts !== 1 ? 's' : ''}` : ''}`}</span>
                {isPro(user) && prostats && prostats[ProStatsLevelType.PlayAttemptsOverTime] && (
                  <span>
                    {dynamicDurationDisplay(prostats[ProStatsLevelType.PlayAttemptsOverTime].reduce((a, b) => a + b.sum, 0)) + ' played'}
                  </span>)}
              </div>
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
      <div className='flex flex-col gap-3'>
        <Tab.Group>
          <Tab.List className='flex space-x-1 rounded text-sm'>
            <Tab
              className='p-2 bg-blue-800 rounded hover:bg-gray-600 ui-selected:bg-blue-600'>
              Least Steps
            </Tab>
            <Tab className='p-2 flex flex-row items-center gap-2 bg-blue-800 rounded hover:bg-gray-600 ui-selected:bg-blue-600'>
              <Image alt='pro' src='/pro.svg' width='16' height='16' />
              <span>Solves</span>
            </Tab>
            <Tab className='p-2 flex flex-row items-center gap-2 bg-blue-800 rounded hover:bg-gray-600 ui-selected:bg-blue-600'>
              <Image alt='pro' src='/pro.svg' width='16' height='16' />
              <span>Time Played</span>
            </Tab>
          </Tab.List>
          <Tab.Panels>
            <Tab.Panel>
              {!levelContext?.records ?
                <div>
                  Loading...
                </div>
                :
                <>
                  {recordDivs}
                  {levelContext.records.length > 1 &&
                    <button
                      className='italic underline block mt-1 text-sm'
                      onClick={() => setHideStats(s => !s)}
                    >
                      {`${hideStats ? 'Show' : 'Hide'} history`}
                    </button>
                  }
                </>
              }
            </Tab.Panel>
            <Tab.Panel>
              {isPro(user) ? (
                prostats && prostats[ProStatsLevelType.CommunityStepData] && prostats[ProStatsLevelType.CommunityStepData].length > 0 ? (
                  <ProLevelStepBucketAnalytics prostats={prostats} />
                ) : (
                  <div className='text-sm'>No step data available</div>
                )
              ) : (
                <div className='text-sm'>
                  <Link href='/settings/proaccount' className='text-blue-300'>
                  Sign up
                  </Link> for Pro to see the community step data for {level.name}
                </div>
              )}
            </Tab.Panel>
            <Tab.Panel>
              {isPro(user) ? (
                prostats && prostats[ProStatsLevelType.PlayAttemptsOverTime] && prostats[ProStatsLevelType.PlayAttemptsOverTime].length > 0 ? (
                  <ProLevelPlayTimeAnalytics prostats={prostats} />
                ) : (
                  <div className='text-sm'>No playtime data available</div>
                )
              ) : (
                <div className='text-sm'>
                  <Link href='/settings/proaccount' className='text-blue-300'>
                  Sign up
                  </Link> for Pro to see the community playtime data for {level.name}
                </div>
              )}
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
