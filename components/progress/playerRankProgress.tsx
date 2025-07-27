import { difficultyList } from '@root/components/formatted/formattedDifficulty';
import LoadingSpinner from '@root/components/page/loadingSpinner';
import useSWRHelper from '@root/hooks/useSWRHelper';
import React, { useEffect, useRef, useState } from 'react';

interface SkillAchievement {
  achievementType: string;
  difficultyIndex: number;
  requirement: number;
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
}

export default function PlayerRankProgress({ className = '' }: PlayerRankProgressProps) {
  const { data: rankData, error } = useSWRHelper<PlayerRankProgressData>('/api/player-rank-stats');
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
  const equalSpacing = 160; // Increased spacing for better readability
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
      percentile: skillAch?.percentile || 0,
      progressionRate,
      progressionFromRank,
      isAchieved: skillAch?.isUnlocked || false,
      isCurrent: skillAch?.isUnlocked && difficultyIndex === highestAchievedIndex,
      isNext: !skillAch?.isUnlocked && difficultyIndex === nextUnachievedIndex,
      isNextPlus: !skillAch?.isUnlocked && difficultyIndex === nextUnachievedIndex + 1
    };
  });

  // Add Newb at the end (bottom) if user has no achievements
  if (highestAchievedIndex === 0) {
    allRankPositions.push({
      rank: { name: 'Newb', emoji: '🆕', description: 'Welcome to Thinky!' },
      difficultyIndex: 0,
      position: rankPositions.length * equalSpacing, // Position after all skill ranks
      requirement: 0,
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
    <div className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 border border-slate-700 shadow-2xl ${className}`}>
      {/* Header */}
      <div className='text-center mb-4'>
        <h3 className='text-xl font-bold text-white mb-2'>
          Rank Progression
        </h3>
      </div>
      {/* Vertical rank progression */}
      <div className='relative'>
        {/* Scrollable viewport container - matched to chapter cards height */}
        <div
          ref={scrollContainerRef}
          className='relative overflow-y-auto bg-slate-950/30 rounded-lg border border-slate-700/50 scroll-smooth'
          style={{ scrollbarWidth: 'thin', height: '500px' }}
        >

          {/* Content container */}
          <div
            className='relative px-4 py-8'
            style={{
              height: `${allRankPositions.length * 160 + 80}px` // Dynamic height based on ranks shown
            }}
          >

            {/* Connecting line */}
            <div className='absolute left-8 top-[40px] w-0.5 bg-slate-600' style={{ height: `${allRankPositions.length * 160}px` }} />
              
              {/* Rank nodes and progression rates */}
            {allRankPositions.map((rankPos, index) => (
              <React.Fragment key={rankPos.isNewb ? 'newb' : rankPos.rank.emoji}>
                {/* Progression rate display - shown between ranks */}
                {index > 0 && (() => {
                  const higherRank = rankPos; // Current rank in array (harder)
                  const lowerRank = allRankPositions[index - 1]; // Previous rank in array (easier, since we sorted hardest-first)

                  // Calculate progression rate from easier rank to harder rank
                  if (!higherRank.isNewb && !lowerRank.isNewb) {
                    const higherAch = rankData.skillAchievements.find(ach => ach.difficultyIndex === higherRank.difficultyIndex);
                    const lowerAch = rankData.skillAchievements.find(ach => ach.difficultyIndex === lowerRank.difficultyIndex);

                    // What % of people who achieved the easier rank also achieved the harder rank
                    // From debug: easier ranks have MORE people, harder ranks have FEWER people
                    // So progression rate should be: harder_count / easier_count
                    // Determine which is easier vs harder based on difficultyIndex
                    const easierRank = lowerRank.difficultyIndex < higherRank.difficultyIndex ? lowerRank : higherRank;
                    const harderRank = lowerRank.difficultyIndex > higherRank.difficultyIndex ? lowerRank : higherRank;
                    const easierAch = rankData.skillAchievements.find(ach => ach.difficultyIndex === easierRank.difficultyIndex);
                    const harderAch = rankData.skillAchievements.find(ach => ach.difficultyIndex === harderRank.difficultyIndex);

                    if (easierAch && harderAch && easierAch.count > 0) {
                      const progressionRate = (harderAch.count / easierAch.count) * 100;
                      const midPoint = (lowerRank.position + higherRank.position) / 2;

                      return (
                        <div
                          className='absolute left-12 flex items-center'
                          style={{
                            top: `${midPoint + 40}px`,
                            transform: 'translateY(-50%)'
                          }}
                        >
                          <div className='text-xs text-slate-500 italic'>
                            {progressionRate.toFixed(1)}% of {easierRank.rank.name} players advance to {harderRank.rank.name}
                          </div>
                        </div>
                      );
                    }
                  }

                  return null;
                })()}
                {/* Rank card */}
                <div
                  className='absolute left-0 flex items-center gap-4'
                  style={{
                    top: `${rankPos.position + 40}px`, // Offset for padding
                    transform: 'translateY(-50%)'
                  }}
                >
                  {/* Connection dot */}
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                      rankPos.isCurrent
                        ? 'bg-blue-500 border-blue-400 shadow-lg shadow-blue-500/50'
                        : rankPos.isAchieved
                          ? 'bg-emerald-500 border-emerald-400'
                          : rankPos.isNext
                            ? 'bg-slate-700 border-slate-600'
                            : 'bg-slate-800 border-slate-700 opacity-40'
                    }`}
                  >
                    {(rankPos.isCurrent || rankPos.isAchieved) && (
                      <div className='w-2 h-2 bg-white rounded-full' />
                    )}
                  </div>
                  {/* Rank card */}
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg border min-w-64 transition-all duration-300 ${
                      rankPos.isCurrent
                        ? 'bg-blue-900/40 border-blue-500/60 shadow-lg'
                        : rankPos.isAchieved
                          ? 'bg-emerald-900/20 border-emerald-500/40'
                          : rankPos.isNext
                            ? 'bg-slate-800/40 border-slate-600/40'
                            : 'bg-slate-800/20 border-slate-700/20 opacity-40'
                    }`}
                  >
                    <div className={`text-2xl ${rankPos.isCurrent ? 'scale-110' : ''}`}>
                      {rankPos.rank.emoji}
                    </div>
                    <div className='flex-1'>
                      <div className={`font-semibold text-sm ${
                        rankPos.isCurrent
                          ? 'text-blue-200'
                          : rankPos.isAchieved
                            ? 'text-emerald-200'
                            : rankPos.isNext
                              ? 'text-slate-300'
                              : 'text-slate-500'
                      }`}>
                        {rankPos.rank.name}
                      </div>
                      <div className='text-xs text-slate-500'>
                        {rankPos.rank.description}
                      </div>
                      {rankPos.percentile > 0 && (
                        <div className='text-xs text-slate-400 mt-1'>
                            Only {rankPos.percentile.toFixed(1)}% of players have achieved this rank
                        </div>
                      )}
                    </div>
                    <div className='text-right'>
                      {rankPos.isAchieved ? (
                        rankPos.isCurrent ? (
                          <div className='px-2 py-1 bg-blue-500 text-white text-xs rounded-full font-semibold'>
                              Current
                          </div>
                        ) : (
                          <div className='text-emerald-400 text-xs'>✓ Achieved</div>
                        )
                      ) : rankPos.isNext ? (
                        <div className='flex flex-col items-end gap-1'>
                          <div className='px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded font-semibold'>
                              Next Goal
                          </div>
                          {rankPos.requirement && (
                            <div className='text-xs text-emerald-400'>
                                Need {rankPos.requirement}+ {rankPos.rank.name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className='w-4 h-4 border border-slate-700 rounded-full opacity-30' />
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
          {/* Current position indicator - positioned relative to current rank */}
          {animationPhase === 'arrived' && (
            <div
              className='absolute right-2 text-xs text-slate-400 bg-slate-800/80 px-2 py-1 rounded z-10'
              style={{ top: `${currentRankPosition + 40}px`, transform: 'translateY(-50%)' }}
            >
                You are here! →
            </div>
          )}
        </div>
        {/* Progress summary */}
        <div className='mt-4 text-center'>
          <p className='text-slate-300 text-sm'>
            {highestAchievedIndex >= 8 ? (
              <>🔥 Elite level achieved! You're among the puzzle masters!</>
            ) : highestAchievedIndex >= 5 ? (
              <>🚀 Excellent progress! You're climbing toward mastery!</>
            ) : highestAchievedIndex >= 3 ? (
              <>💪 Great work! Keep solving to reach new heights!</>
            ) : (
              <>⭐ You're building skills! Each puzzle brings progress!</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
