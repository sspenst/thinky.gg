import Link from 'next/link';
import React, { JSX, useCallback } from 'react';
import { EnrichedCollection } from '../../models/db/collection';
import { EnrichedLevel } from '../../models/db/level';
import SelectOptionStats from '../../models/selectOptionStats';
import FilterButton from '../buttons/filterButton';
import ChapterLevelPortal from '../cards/chapterLevelPortal';

function getCompleteIcon(complete: boolean) {
  if (complete) {
    return (
      <div className='rounded-full bg-green-500 border' style={{
        borderColor: 'var(--bg-color-4)',
      }}>
        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M9 12.75L11.25 15 15 9.75M21 12' />
        </svg>
      </div>
    );
  } else {
    return (
      <div className='rounded-full bg-neutral-500 border' style={{
        borderColor: 'var(--bg-color-4)',
      }}>
        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M16 12H8' />
        </svg>
      </div>
    );
  }
}

interface FormattedCampaignProps {
  enrichedCollections: EnrichedCollection[];
  hideUnlockRequirements?: boolean;
  levelHrefQuery: string;
  nextHref?: string;
  nextTitle?: string;
  solvedElement: JSX.Element;
  solvedLevels: number;
  subtitle?: string;
  title: string;
  totalLevels: number;
}

export default function FormattedCampaign({
  enrichedCollections,
  hideUnlockRequirements,
  levelHrefQuery,
  nextHref,
  nextTitle,
  solvedElement,
  solvedLevels,
  subtitle,
  title,
  totalLevels,
}: FormattedCampaignProps) {
  const [filter, setFilter] = React.useState<string>('SHOW_ALL');

  const getLevelOptions = useCallback((enrichedCollection: EnrichedCollection) => {
    const levelOptions: JSX.Element[] = [];
    const filteredLevels = (enrichedCollection.levels as EnrichedLevel[]).filter(level =>
      !(filter === 'HIDE_SOLVED' && level.userMoves === level.leastMoves)
    );

    filteredLevels.forEach((level, index) => {
      levelOptions.push(
        <div className='relative flex items-center justify-center' key={`campaign-level-${level._id.toString()}`}>
          {/* Connection Path to Next Level */}
          {index < filteredLevels.length - 1 && (
            <div className='absolute top-12 left-12 w-full h-0.5 bg-gradient-to-r from-white/30 to-transparent z-0 transform rotate-12' />
          )}
          
          {/* Level Portal */}
          <div className='relative z-10'>
            <ChapterLevelPortal
              href={`/level/${level.slug}?cid=${enrichedCollection._id}&${levelHrefQuery}`}
              id='campaign'
              level={level}
            />
          </div>
        </div>
      );
    });

    return levelOptions;
  }, [filter, levelHrefQuery]);

  const getOptions = useCallback(() => {
    const options: JSX.Element[] = [];
    let prevMajorCollection: EnrichedCollection | undefined = undefined;

    for (const enrichedCollection of enrichedCollections) {
      let lockedStr: string | undefined = undefined;

      if (prevMajorCollection) {
        const unlockPercent = enrichedCollection.unlockPercent ?? 50;
        const remainingLevels = Math.ceil(prevMajorCollection.levelCount * unlockPercent / 100) - prevMajorCollection.userSolvedCount;

        if (remainingLevels > 0) {
          lockedStr = `Solve ${remainingLevels} more level${remainingLevels === 1 ? '' : 's'} from ${prevMajorCollection.name}`;
        }
      }

      const stats = new SelectOptionStats(enrichedCollection.levelCount, enrichedCollection.userSolvedCount);
      const levels = getLevelOptions(enrichedCollection);

      options.push(
        <div
          className='relative'
          key={`collection-${enrichedCollection._id.toString()}`}
        >
          {/* Floating Island Base */}
          <div className='relative max-w-4xl mx-auto'>
            {/* Island Shadow */}
            <div className='absolute -bottom-6 sm:-bottom-8 left-1/2 transform -translate-x-1/2 w-64 sm:w-80 h-16 sm:h-20 bg-black/20 rounded-full blur-xl' />
            {/* Main Island */}
            <div className={`relative bg-gradient-to-br ${lockedStr
              ? 'from-gray-600 via-gray-700 to-gray-800'
              : 'from-emerald-400 via-teal-500 to-cyan-600'
            } rounded-t-[2rem] sm:rounded-t-[3rem] rounded-b-xl sm:rounded-b-2xl shadow-2xl overflow-hidden`}>

              {/* Mystical Aura */}
              <div className='absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20 animate-pulse' />
              {/* Collection Header - Island Peak */}
              <div className='relative p-4 sm:p-8 text-center'>
                {/* Floating Crystals */}
                <div className='absolute inset-0 opacity-30'>
                  <div className='absolute top-2 sm:top-4 left-4 sm:left-8 w-3 sm:w-4 h-3 sm:h-4 bg-yellow-300 rotate-45 animate-spin' style={{ animationDuration: '3s' }} />
                  <div className='absolute top-3 sm:top-6 right-6 sm:right-12 w-2 sm:w-3 h-2 sm:h-3 bg-pink-300 rotate-45 animate-spin' style={{ animationDelay: '1s', animationDuration: '4s' }} />
                  <div className='absolute bottom-2 sm:bottom-4 left-6 sm:left-12 w-4 sm:w-5 h-4 sm:h-5 bg-blue-300 rotate-45 animate-spin' style={{ animationDelay: '2s', animationDuration: '2s' }} />
                </div>
                
                <div className='relative z-10'>
                  {/* Collection Title as Floating Banner */}
                  <div className='mb-4 sm:mb-6'>
                    <div className='inline-block transform -rotate-2'>
                      <div className='bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl shadow-lg text-lg sm:text-xl'>
                        {enrichedCollection.name}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Crystal */}
                  {!lockedStr && (
                    <div className='mb-4 sm:mb-6'>
                      <div className='relative w-24 h-24 sm:w-32 sm:h-32 mx-auto'>
                        <svg className='w-24 h-24 sm:w-32 sm:h-32 transform -rotate-90' viewBox='0 0 128 128'>
                          <circle
                            cx='64'
                            cy='64'
                            r='56'
                            fill='none'
                            stroke='rgba(255,255,255,0.2)'
                            strokeWidth='4'
                          />
                          <circle
                            cx='64'
                            cy='64'
                            r='56'
                            fill='none'
                            stroke='url(#islandGradient)'
                            strokeWidth='4'
                            strokeLinecap='round'
                            strokeDasharray={`${2 * Math.PI * 56}`}
                            strokeDashoffset={`${2 * Math.PI * 56 * (1 - enrichedCollection.userSolvedCount / enrichedCollection.levelCount)}`}
                            className='transition-all duration-2000 ease-out'
                          />
                          <defs>
                            <linearGradient id='islandGradient'>
                              <stop offset='0%' stopColor='#fbbf24' />
                              <stop offset='100%' stopColor='#10b981' />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className='absolute inset-0 flex flex-col items-center justify-center text-white'>
                          <div className='text-xl sm:text-2xl font-black'>{enrichedCollection.userSolvedCount}</div>
                          <div className='text-xs opacity-80'>of {enrichedCollection.levelCount}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Lock Indicator */}
                  {lockedStr && (
                    <div className='mb-4 sm:mb-6'>
                      <div className='text-4xl sm:text-6xl mb-2 sm:mb-4 animate-bounce'>🔒</div>
                      <div className='text-white/80 font-bold text-sm sm:text-base'>LOCKED REALM</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Collection Content - Island Surface */}
              <div className='bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-sm p-4 sm:p-6 border-t border-white/20'>
                {lockedStr ? (
                  <div className='text-center py-6 sm:py-8'>
                    <div className='text-white/90 text-sm leading-relaxed max-w-xs sm:max-w-sm mx-auto'>
                      {lockedStr}
                    </div>
                  </div>
                ) : (
                  <>
                    {!stats.isSolved() && (
                      <div className='mb-4 sm:mb-6 text-center'>
                        <div className='inline-block bg-black/30 backdrop-blur-sm text-white font-bold px-3 sm:px-4 py-1 sm:py-2 rounded-full border border-white/30'>
                          <span className='text-yellow-300 text-sm sm:text-base'>{stats.getText()}</span>
                          <span className='text-xs sm:text-sm'> levels solved</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Level Grid as Mini Islands */}
                    <div className='grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8 justify-items-center'>
                      {levels.length > 0 ? levels : (
                        <div className='col-span-full text-center py-6 sm:py-8'>
                          <div className='text-3xl sm:text-4xl mb-2'>🏆</div>
                          <div className='text-white font-bold text-xs sm:text-sm'>
                            REALM CONQUERED!
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      );

      if (!enrichedCollection.isThemed) {
        prevMajorCollection = enrichedCollection;
      }
    }

    return options;
  }, [enrichedCollections, getLevelOptions]);

  const totalStats = new SelectOptionStats(totalLevels, solvedLevels);
  const remainingLevels = Math.ceil(totalLevels * 0.75) - solvedLevels;
  const isCampaignComplete = remainingLevels <= 0 && enrichedCollections.filter(c => !c.isThemed).every(c => Math.ceil(c.levelCount * 0.5) - c.userSolvedCount <= 0);

  return (<>
    {/* Level Selection World */}
    <div className='relative bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900 min-h-screen'>
      {/* Floating Islands Background */}
      <div className='absolute inset-0 opacity-30'>
        <div className='absolute top-10 left-10 w-40 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur-xl animate-pulse' />
        <div className='absolute top-32 right-20 w-32 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full blur-xl animate-pulse' style={{ animationDelay: '1s' }} />
        <div className='absolute bottom-20 left-1/4 w-36 h-18 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full blur-xl animate-pulse' style={{ animationDelay: '2s' }} />
      </div>
      
      {/* Chapter Overview */}
      <div className='relative z-10 text-center py-8 sm:py-16 px-4'>
        <div className='mb-6 sm:mb-8'>
          <div className='inline-block px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black rounded-full text-lg sm:text-xl shadow-2xl mb-4 transform hover:scale-105 transition-all duration-300'>
            LEVEL SELECT
          </div>
        </div>
        
        {solvedLevels === totalLevels && (
          <div className='mb-8 sm:mb-12 p-6 sm:p-8 bg-gradient-to-r from-green-400/20 to-emerald-500/20 border border-green-400/50 rounded-3xl backdrop-blur-sm max-w-2xl mx-auto'>
            <div className='text-4xl sm:text-6xl mb-4'>🏆</div>
            <div className='text-2xl sm:text-3xl font-black text-green-400 mb-2'>CHAPTER COMPLETE!</div>
            <div className='text-base sm:text-lg text-green-300 mb-4 sm:mb-6 px-2'>
              Congratulations! You&apos;ve mastered every challenge in {title}.
            </div>
            {isCampaignComplete && nextTitle && nextHref && (
              <Link
                href={nextHref}
                className='inline-block bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black py-3 sm:py-4 px-6 sm:px-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300'
              >
                <div className='flex items-center gap-2 sm:gap-3'>
                  <span className='text-xl sm:text-2xl'>🚀</span>
                  <span className='text-base sm:text-lg'>{nextTitle}</span>
                </div>
              </Link>
            )}
          </div>
        )}
        
        {/* Filter Toggle */}
        {solvedLevels > 0 && (
          <div className='mb-2 sm:mb-3'>
            <button
              onClick={() => setFilter(filter === 'HIDE_SOLVED' ? 'SHOW_ALL' : 'HIDE_SOLVED')}
              className='group relative overflow-hidden bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-bold py-3 px-4 sm:px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300'
            >
              <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-10 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-500' />
              <div className='relative flex items-center gap-2'>
                <span className='text-lg sm:text-xl'>{filter === 'HIDE_SOLVED' ? '👁️' : '🔍'}</span>
                <span className='text-sm sm:text-base'>{filter === 'HIDE_SOLVED' ? 'Show All Levels' : 'Hide Solved Levels'}</span>
              </div>
            </button>
          </div>
        )}
      </div>
      
      {/* Level Collections as Game Islands */}
      <div className='relative z-10 pb-12 sm:pb-20'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='space-y-12 sm:space-y-20'>
            {getOptions()}
          </div>
        </div>
      </div>
    </div>
  </>);
}
