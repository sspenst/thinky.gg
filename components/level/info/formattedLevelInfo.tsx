import { Tab } from '@headlessui/react';
import FormattedDate from '@root/components/formatted/formattedDate';
import Solved from '@root/components/level/info/solved';
import FormattedLevelReviews from '@root/components/level/reviews/formattedLevelReviews';
import StyledTooltip from '@root/components/page/styledTooltip';
import Image from 'next/image';
import Link from 'next/link';
import React, { useContext, useState } from 'react';
import Dimensions from '../../../constants/dimensions';
import { AppContext } from '../../../contexts/appContext';
import { EnrichedLevel } from '../../../models/db/level';
import SelectOptionStats from '../../../models/selectOptionStats';
import FormattedAuthorNote from '../../formatted/formattedAuthorNote';
import FormattedDifficulty from '../../formatted/formattedDifficulty';
import FormattedUser from '../../formatted/formattedUser';
import LevelDropdown from './levelDropdown';
import LevelInfoCompletions from './levelInfoCompletions';
import LevelInfoPlayTime from './levelInfoPlayTime';
import LevelInfoRecords from './levelInfoRecords';

interface AuthorNoteProps {
  authorNote: string;
}

function AuthorNote({ authorNote }: AuthorNoteProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const maxCollapsedAuthorNote = 150;

  // NB: some characters take more than one character in a string array, such as "𝙮"
  // this function handles truncating these characters safely
  function truncateString(text: string, maxLength: number) {
    if (text.length <= maxLength) {
      return text;
    }

    let truncatedText = '';
    let currentLength = 0;

    for (const char of text) {
      if (currentLength + char.length <= maxLength) {
        truncatedText += char;
        currentLength += char.length;
      } else {
        break;
      }
    }

    return truncatedText;
  }

  const truncatedNote = truncateString(authorNote, maxCollapsedAuthorNote);
  const canCollapse = truncatedNote.length < authorNote.length;

  return (
    <div className='flex flex-col'>
      <FormattedAuthorNote authorNote={(canCollapse && isCollapsed ? `${truncatedNote}...` : authorNote)} />
      {canCollapse &&
        <button
          className='italic underline w-fit mt-1 text-sm'
          onClick={() => setIsCollapsed(c => !c)}
        >
          {`Show ${isCollapsed ? 'more' : 'less'}`}
        </button>
      }
    </div>
  );
}

interface FormattedLevelInfoProps {
  level: EnrichedLevel;
}

export default function FormattedLevelInfo({ level }: FormattedLevelInfoProps) {
  const { userConfig } = useContext(AppContext);
  const stat = new SelectOptionStats(level.leastMoves, level.userMoves);

  function Divider() {
    return (
      <div className='mx-3 my-4 opacity-30' style={{
        backgroundColor: 'var(--bg-color-4)',
        height: 1,
      }} />
    );
  }

  return (<>
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        {level.isRanked && <>
          <Link
            className='flex gap-1 pl-1 pr-1 py-0.5 items-center border-2 rounded-md w-fit border-yellow-500 bg-yellow-200 text-sm font-medium text-black'
            data-tooltip-content='This level contributes to your leaderboard ranking!'
            data-tooltip-id='ranked-tooltip'
            href='/ranked'
          >
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={2.5} stroke='currentColor' className='w-4 h-4'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z' />
            </svg>
            {/* <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={2} stroke='currentColor' className='w-4 h-4'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z' />
            </svg> */}

            <span className='leading-none pt-px'>Ranked</span>
          </Link>
          <StyledTooltip id='ranked-tooltip' />
        </>}
        {/* {level.isRanked &&
          <div className='px-1 border-2 rounded-md w-fit border-yellow-500 bg-yellow-200 text-sm font-medium text-black'>
            Ranked
          </div>
        } */}
        <div className='flex justify-between w-full items-start gap-2'>
          <div className='font-bold text-2xl overflow-hidden break-words'>{level.name}</div>
          <div className='mt-1'>
            <LevelDropdown level={level} />
          </div>
        </div>
        <div className='flex gap-2 items-center'>
          <FormattedUser id='author' size={Dimensions.AvatarSizeSmall} user={level.userId} />
          <FormattedDate ts={level.ts} />
        </div>
        <div className='text-sm flex pt-0.5'>
          <FormattedDifficulty difficultyEstimate={level.calc_difficulty_estimate} id={level._id.toString()} uniqueUsers={level.calc_playattempts_unique_users_count} />
        </div>
      </div>
      {level.authorNote && <AuthorNote authorNote={level.authorNote} />}
      {level.archivedTs && <>
        <div className='flex flex-row gap-2 items-center'>
          <span className='font-medium whitespace-nowrap'>Archived by:</span>
          <FormattedUser id='archived-by' size={Dimensions.AvatarSizeSmall} user={level.archivedBy} />
          <FormattedDate ts={level.archivedTs} />
        </div>
      </>}
    </div>
    <Divider />
    <div className='mb-4 flex flex-col gap-4'>
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
    <Divider />
    <FormattedLevelReviews />
  </>);
}
