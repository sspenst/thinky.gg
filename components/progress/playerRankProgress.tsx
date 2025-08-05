import { difficultyList } from '@root/components/formatted/formattedDifficulty';
import LoadingSpinner from '@root/components/page/loadingSpinner';
import StyledTooltip from '@root/components/page/styledTooltip';
import { AppContext } from '@root/contexts/appContext';
import useSWRHelper from '@root/hooks/useSWRHelper';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useRef, useState } from 'react';

interface SkillAchievement {
  achievementType: string;
  difficultyIndex: number;
  requirement: number;
  userProgress: number;
  isUnlocked: boolean;
  count: number;
  percentile: number;
}

interface PlayerRankProgressData {
  skillAchievements: SkillAchievement[];
  totalActiveUsers: number;
}

interface PlayerRankProgressProps {
  className?: string;
  customCta?: React.ReactNode;
}

export default function PlayerRankProgress({ className = '', customCta }: PlayerRankProgressProps) {
  const { data: rankData, error } = useSWRHelper<PlayerRankProgressData>('/api/player-rank-stats');
  const { game, user } = useContext(AppContext);
  const router = useRouter();

  // Get current chapter data to find first unsolved level
  const chapterUnlocked = user?.config?.chapterUnlocked || 1;
  const [animationPhase, setAnimationPhase] = useState<'starting' | 'traveling' | 'arrived'>('starting');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rankData) {
      const timer1 = setTimeout(() => setAnimationPhase('traveling'), 300);
      const timer2 = setTimeout(() => setAnimationPhase('arrived'), 2000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [rankData]);

  useEffect(() => {
    if (scrollContainerRef.current && animationPhase !== 'starting') {
      const targetScroll = getScrollPosition();
      const duration = animationPhase === 'traveling' ? 1500 : 300;
      const startTime = Date.now();
      const startScroll = scrollContainerRef.current.scrollTop;

      const animateScroll = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic

        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = startScroll + (targetScroll - startScroll) * easeProgress;
        }

        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        }
      };

      requestAnimationFrame(animateScroll);
    }
  }, [animationPhase, rankData]);

  if (error) {
    return (
      <div className={`bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded ${className}`}>
        Failed to load rank information
      </div>
    );
  }

  if (!rankData) {
    return (
      <div className={`flex items-center justify-center p-6 ${className}`}>
        <LoadingSpinner size={32} />
      </div>
    );
  }

  // Find highest achieved rank (users start with no achievements)
  const achievedRanks = rankData.skillAchievements.filter(ach => ach.isUnlocked);
  const highestAchievedIndex = achievedRanks.length > 0 ?
    Math.max(...achievedRanks.map(ach => ach.difficultyIndex)) : 0;

  // Determine which ranks to show - show all achieved ranks plus next 2 unachieved
  const nextUnachievedIndex = highestAchievedIndex + 1;
  const ranksToShow = [];

  // Add all achieved ranks (from 1 to highestAchievedIndex)
  for (let i = 1; i <= highestAchievedIndex; i++) {
    ranksToShow.push(i);
  }

  // Add next 2 unachieved ranks if they exist
  if (nextUnachievedIndex <= 10) {
    ranksToShow.push(nextUnachievedIndex);
  }

  if (nextUnachievedIndex + 1 <= 10) {
    ranksToShow.push(nextUnachievedIndex + 1);
  }

  // Remove duplicates
  const uniqueRanks = [...new Set(ranksToShow)];

  // Sort in descending order (hardest to easiest) then reverse for display (easiest at bottom)
  uniqueRanks.sort((a, b) => b - a);

  // Build rank positions from skill achievements
  const equalSpacing = 140; // Reduced spacing for mobile compatibility
  let allRankPositions = [];

  // Sort ranks from hardest to easiest for proper positioning (easiest at bottom = highest position)
  uniqueRanks.sort((a, b) => b - a);

  const rankPositions = uniqueRanks.map((difficultyIndex, index) => {
    const skillAch = rankData.skillAchievements.find(ach => ach.difficultyIndex === difficultyIndex);
    const rank = difficultyList[difficultyIndex];

    // Calculate progression rate: what % of people from previous rank made it to this rank
    let progressionRate = null;
    let progressionFromRank = null;

    if (skillAch && difficultyIndex > 1) { // Skip Kindergarten since there's no rank below it
      const previousRankAch = rankData.skillAchievements.find(ach => ach.difficultyIndex === difficultyIndex - 1);

      if (previousRankAch && previousRankAch.count > 0 && skillAch.count > 0) {
        progressionRate = ((skillAch.count / previousRankAch.count) * 100);
        progressionFromRank = difficultyList[difficultyIndex - 1]?.name;
      }
    }

    return {
      rank,
      difficultyIndex,
      position: index * equalSpacing, // Position skill ranks first
      requirement: skillAch?.requirement || 0,
      userProgress: skillAch?.userProgress || 0,
      percentile: skillAch?.percentile || 0,
      progressionRate,
      progressionFromRank,
      isAchieved: skillAch?.isUnlocked || false,
      isCurrent: skillAch?.isUnlocked && difficultyIndex === highestAchievedIndex,
      isNext: !skillAch?.isUnlocked && difficultyIndex === nextUnachievedIndex,
      isNextPlus: !skillAch?.isUnlocked && difficultyIndex === nextUnachievedIndex + 1,
      isNewb: false
    };
  });

  // Add Newb at the end (bottom) if user has no achievements
  if (highestAchievedIndex === 0) {
    allRankPositions.push({
      rank: { name: 'Newb', emoji: '🆕', description: 'Welcome to Thinky!' },
      difficultyIndex: 0,
      position: rankPositions.length * equalSpacing, // Position after all skill ranks
      requirement: 0,
      userProgress: 0,
      percentile: 0,
      isAchieved: false,
      isCurrent: true, // New players are currently "Newb"
      isNext: false,
      isNextPlus: false,
      isNewb: true
    });
  }

  // Combine skill ranks + Newb (if applicable)
  allRankPositions = [...rankPositions, ...allRankPositions];

  // Find current rank position for animation (or next goal if no achievements)
  const currentRankPosition = allRankPositions.find(r => r.isCurrent)?.position ||
                              allRankPositions.find(r => r.isNext)?.position || 0;

  // Get the actual current rank's stats (the highest achieved rank)
  const currentRankStats = highestAchievedIndex > 0 ?
    rankData.skillAchievements.find(ach => ach.difficultyIndex === highestAchievedIndex && ach.isUnlocked) :
    null;

  // Animation: scroll to center current rank in viewport
  const getScrollPosition = () => {
    if (animationPhase === 'starting') return 0;
    // Center the current rank in the 500px viewport
    // Add 40px for padding offset, subtract half viewport height
    const targetScroll = Math.max(0, currentRankPosition + 40 - 250);

    return targetScroll;
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Floating Island Effect */}
      <div className='absolute -inset-4 bg-gradient-to-r from-purple-600/30 via-cyan-500/30 to-pink-500/30 blur-xl opacity-60' />
      
      {/* Vertical rank progression */}
      <div className='relative'>
        {/* Scrollable viewport container - matched to chapter cards height */}
        <div
          ref={scrollContainerRef}
          className='relative overflow-y-auto bg-white/10 backdrop-blur-md rounded-lg border border-white/30 scroll-smooth'
          style={{ scrollbarWidth: 'thin', height: '500px' }}
        >
          <div className='p-6 space-y-4'>
            {allRankPositions.map((rankPos, index) => (
              <div key={rankPos.isNewb ? 'newb' : rankPos.rank.emoji} className='flex items-center gap-4'>
                {/* Connection dot */}
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    rankPos.isCurrent
                      ? 'bg-purple-500/80 border-purple-400/80 shadow-lg shadow-purple-500/50'
                      : rankPos.isAchieved
                        ? 'bg-emerald-500/80 border-emerald-400/80'
                        : rankPos.isNext
                          ? 'bg-cyan-500/40 border-cyan-400/40 animate-pulse'
                          : 'bg-white/10 border-white/20 opacity-40'
                  }`}
                >
                  {(rankPos.isCurrent || rankPos.isAchieved) && (
                    <div className='w-2 h-2 bg-white rounded-full' />
                  )}
                </div>
                
                {/* Rank card */}
                <div
                  className={`flex flex-col gap-3 p-4 rounded-2xl border w-full transition-all duration-300 backdrop-blur-md ${
                    rankPos.isCurrent
                      ? 'bg-gradient-to-br from-purple-900/60 to-purple-800/40 border-purple-400/50 shadow-lg shadow-purple-500/20'
                      : rankPos.isAchieved
                        ? 'bg-gradient-to-br from-emerald-900/50 to-emerald-800/30 border-emerald-400/40 shadow-md shadow-emerald-500/15'
                        : rankPos.isNext
                          ? 'bg-gradient-to-br from-cyan-900/30 to-blue-900/20 border-cyan-400/20 shadow-sm shadow-cyan-400/10'
                          : 'bg-gradient-to-br from-gray-900/30 to-gray-800/20 border-white/15 opacity-60'
                  }`}
                >
                  {/* Top row: rank info and status */}
                  <div className='flex items-center gap-3'>
                    <div className={`text-2xl ${rankPos.isCurrent ? 'scale-110' : ''}`}>
                      {rankPos.rank.emoji}
                    </div>
                    <div className='flex-1'>
                      <Link href='/achievements#category-LEVEL_COMPLETION' className='block hover:opacity-80 transition-opacity'>
                        <div className={`font-semibold text-base ${
                          rankPos.isCurrent
                            ? 'text-white'
                            : rankPos.isAchieved
                              ? 'text-white'
                              : rankPos.isNext
                                ? 'text-white'
                                : 'text-white/70'
                        }`}>
                          {rankPos.rank.name}
                        </div>
                        <div className='text-sm text-white/90'>
                          {rankPos.rank.description}
                        </div>
                        {rankPos.percentile > 0 && (
                          <div className='text-sm text-white/80 mt-1'>
                              Only {rankPos.percentile.toFixed(1)}% of players have achieved this rank
                          </div>
                        )}
                      </Link>
                    </div>
                    
                    {/* Status for all ranks */}
                    <div className='text-right'>
                      {rankPos.isCurrent ? (
                        <div className='px-3 py-1 bg-gradient-to-r from-purple-600/90 to-pink-600/90 backdrop-blur-sm text-white text-sm rounded-full font-semibold border border-white/30'>
                          Current
                        </div>
                      ) : rankPos.isAchieved ? (
                        <div className='text-white text-sm font-semibold'>
                          <span className='hidden sm:inline'>✓ Achieved</span>
                          <span className='sm:hidden'>✓</span>
                        </div>
                      ) : rankPos.isNext ? (
                        <div className='flex flex-col items-end gap-1'>
                          <div className='px-3 py-1 bg-gradient-to-r from-cyan-800/80 to-blue-800/80 backdrop-blur-sm text-white text-sm rounded-full font-semibold border border-cyan-400/30 animate-pulse'>
                              Next Goal
                          </div>
                          {rankPos.requirement && (
                            <Link
                              href={`/profile/${user?.name}`}
                              className='text-sm text-white cursor-pointer border-b border-dotted border-white/60 hover:text-white/80 transition-colors'
                              data-tooltip-id={`progress-tooltip-${rankPos.difficultyIndex}`}
                              data-tooltip-content={`Counts levels at ${rankPos.rank.name} difficulty or harder`}
                            >
                                Progress: {rankPos.userProgress || 0}/{rankPos.requirement} {rankPos.rank.name} Solved
                            </Link>
                          )}
                        </div>
                      ) : (
                        <div className='w-4 h-4 border border-white/30 rounded-full opacity-30' />
                      )}
                    </div>
                  </div>
                  
                  {/* Bottom row: CTA button for current rank */}
                  {rankPos.isCurrent && (() => {
                    // Use custom CTA if provided, otherwise use default logic
                    if (customCta) {
                      return customCta;
                    }

                    // Default CTA logic
                    const getDefaultCtaInfo = () => {
                      // Get user's chapter progress from context
                      const chapterUnlocked = user?.config?.chapterUnlocked || 1;
                      const currentPath = router.asPath;

                      // For new players (Newb), start with chapter 1
                      if (rankPos.isNewb) {
                        return {
                          href: currentPath.startsWith('/chapter/1') ? '/chapter/1?continue=true' : '/chapter/1',
                          text: currentPath.startsWith('/chapter/1') ? 'Up Next' : 'Start Chapter 1'
                        };
                      }

                      // For advanced players, check if they've completed all chapters
                      if (chapterUnlocked > 3) {
                        return {
                          href: '/ranked',
                          text: 'Play Ranked'
                        };
                      }

                      // For players in progress, direct to their current chapter
                      // The chapter page will handle finding and navigating to the first unsolved level
                      const isContinuePlaying = currentPath.startsWith(`/chapter/${chapterUnlocked}`);

                      return {
                        href: isContinuePlaying ? `/chapter/${chapterUnlocked}?continue=true` : `/chapter/${chapterUnlocked}`,
                        text: isContinuePlaying ? 'Up Next' : `Continue Chapter ${chapterUnlocked}`
                      };
                    };

                    const ctaInfo = getDefaultCtaInfo();

                    return (
                      <Link
                        href={ctaInfo.href}
                        className='group relative w-full px-4 py-3 bg-gradient-to-r from-purple-800/80 to-pink-800/80 backdrop-blur-md hover:bg-gradient-to-r hover:from-purple-700/80 hover:to-pink-700/80 text-white text-base font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border border-purple-400/30 text-center'
                      >
                        <span className='relative z-10 flex items-center justify-center gap-2'>
                          {ctaInfo.text}
                          <svg className='w-5 h-5 transition-transform group-hover:translate-x-1' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 7l5 5m0 0l-5 5m5-5H6' />
                          </svg>
                        </span>
                        <div className='absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl' />
                      </Link>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Progress summary */}
        <div className='mt-6 text-center'>
          <p className='text-white/80 text-base'>
            {highestAchievedIndex >= 8 ? (
              <>🔥 Elite level achieved! You&apos;re among the puzzle masters!</>
            ) : highestAchievedIndex >= 5 ? (
              <>🚀 Excellent progress! You&apos;re climbing toward mastery!</>
            ) : highestAchievedIndex >= 3 ? (
              <>💪 Great work! Keep solving to reach new heights!</>
            ) : (
              <>⭐ You&apos;re building skills! Each puzzle brings progress!</>
            )}
          </p>
        </div>
        </div>
        
        {/* Tooltips for progress indicators */}
        {allRankPositions.map((rankPos) => (
          rankPos.requirement && (
            <StyledTooltip
              key={`tooltip-${rankPos.difficultyIndex}`}
              id={`progress-tooltip-${rankPos.difficultyIndex}`}
            />
          )
        ))}

    </div>
  );
}
