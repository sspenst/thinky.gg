import { difficultyList } from '@root/components/formatted/formattedDifficulty';
import LoadingSpinner from '@root/components/page/loadingSpinner';
import useSWRHelper from '@root/hooks/useSWRHelper';
import React, { useEffect, useRef, useState } from 'react';

interface RankStats {
  count: number;
  percentile: number;
}

interface PlayerRankProgressData {
  stats: { [rankIndex: number]: RankStats };
  totalActiveUsers: number;
  currentUserRank: number;
  rankInfo: Array<{
    index: number;
    name: string;
    emoji: string;
    description: string;
  }>;
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

  const currentRankData = difficultyList[rankData.currentUserRank];
  const currentStats = rankData.stats[rankData.currentUserRank];
  const isCompletelyNew = rankData.currentUserRank === 1 && (!currentStats || currentStats.percentile === 100);

  // All ranks except pending (index 0), reversed so hardest is first
  const allRanks = difficultyList.slice(1).reverse();

  // Calculate positions based on percentiles (harder ranks at top)
  let cumulativePosition = 0;
  const rankPositions = allRanks.map((rank, reverseIndex) => {
    const rankIndex = difficultyList.indexOf(rank);
    const stats = rankData.stats[rankIndex];
    
    // Use percentile to determine spacing - rarer ranks are further apart
    const percentile = stats?.percentile || (100 - (rankIndex - 1) * 10); // Fallback if no stats
    
    // Create logarithmic spacing based on rarity (100 - percentile)
    // Higher rarity (lower percentile) = more spacing
    const rarity = 100 - percentile;
    const baseSpacing = 120;
    const rarityMultiplier = Math.max(1.5, Math.log(rarity + 1) / Math.log(5)); // More aggressive scaling
    const spacing = baseSpacing * rarityMultiplier;
    
    const position = cumulativePosition;
    cumulativePosition += spacing; // Add spacing for next rank
    
    return {
      rank,
      rankIndex,
      position,
      stats,
      percentile,
      isCurrent: rankIndex === rankData.currentUserRank,
      isAchieved: rankIndex <= rankData.currentUserRank
    };
  });

  // Find current rank position for animation
  const currentRankPosition = rankPositions.find(r => r.isCurrent)?.position || 0;

  // Animation: scroll to center current rank in viewport
  const getScrollPosition = () => {
    if (animationPhase === 'starting') return 0;
    // Center the current rank in the 384px (h-96) viewport
    const targetScroll = Math.max(0, currentRankPosition - 152); // Account for padding and centering
    return targetScroll;
  };

  return (
    <div className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 border border-slate-700 shadow-2xl ${className}`}>
      {/* Header */}
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-white mb-2">
          {isCompletelyNew ? 'Your Journey Begins' : 'Rank Progression'}
        </h3>
        {!isCompletelyNew && currentStats && currentStats.percentile < 100 && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/30">
            <span className="text-emerald-400 font-semibold text-sm">
              Top {100 - currentStats.percentile}% Player
            </span>
          </div>
        )}
      </div>

      {isCompletelyNew ? (
        /* Welcome for new players */
        <div className="text-center">
          <div className="mb-6">
            <div className="text-6xl mb-4">{currentRankData?.emoji}</div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to Thinky!</h2>
            <p className="text-slate-400">Your ranking journey starts here</p>
          </div>
          
          <div className="bg-slate-800 rounded-lg p-4 mb-4">
            <div className="text-lg font-bold text-white mb-1">{currentRankData?.name}</div>
            <div className="text-sm text-slate-400">{currentRankData?.description}</div>
          </div>
          
          <p className="text-slate-300 text-sm">
            Complete your first puzzle to begin climbing the ranks!
          </p>
        </div>
      ) : (
        /* Vertical rank progression */
        <div className="relative">
          {/* Scrollable viewport container */}
          <div 
            ref={scrollContainerRef}
            className="relative h-96 overflow-y-auto bg-slate-950/30 rounded-lg border border-slate-700/50 scroll-smooth"
            style={{ scrollbarWidth: 'thin' }}
          >
            
            {/* Content container */}
            <div
              className="relative px-4 py-8"
              style={{
                height: `${Math.max(...rankPositions.map(r => r.position)) + 160}px`
              }}
            >
              {/* Connecting line */}
              <div className="absolute left-8 top-8 w-0.5 bg-slate-600" style={{ height: `${Math.max(...rankPositions.map(r => r.position)) + 40}px` }} />
              
              {/* Rank nodes */}
              {rankPositions.map((rankPos, index) => (
                <div
                  key={rankPos.rank.emoji}
                  className="absolute left-0 flex items-center gap-4"
                  style={{ 
                    top: `${rankPos.position + 40}px`,
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
                        : 'bg-slate-700 border-slate-600'
                    }`}
                  >
                    {rankPos.isAchieved && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>

                  {/* Rank card */}
                  <div 
                    className={`flex items-center gap-3 p-3 rounded-lg border min-w-64 transition-all duration-300 ${
                      rankPos.isCurrent 
                        ? 'bg-blue-900/40 border-blue-500/60 shadow-lg' 
                        : rankPos.isAchieved
                        ? 'bg-emerald-900/20 border-emerald-500/40'
                        : 'bg-slate-800/40 border-slate-600/40 opacity-70'
                    }`}
                  >
                    <div className={`text-2xl ${rankPos.isCurrent ? 'scale-110' : ''}`}>
                      {rankPos.rank.emoji}
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold text-sm ${
                        rankPos.isCurrent 
                          ? 'text-blue-200' 
                          : rankPos.isAchieved 
                          ? 'text-emerald-200'
                          : 'text-slate-400'
                      }`}>
                        {rankPos.rank.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {rankPos.rank.description}
                      </div>
                      {rankPos.rank.name === 'Kindergarten' ? (
                        <div className="text-xs text-slate-400 mt-1">
                          All players started here
                        </div>
                      ) : rankPos.percentile < 100 && (
                        <div className="text-xs text-slate-400 mt-1">
                          Top {(100 - rankPos.percentile).toFixed(1)}% reach here
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {rankPos.isCurrent ? (
                        <div className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full font-semibold">
                          You
                        </div>
                      ) : rankPos.isAchieved ? (
                        <div className="text-emerald-400 text-xs">✓</div>
                      ) : (
                        <div className="w-4 h-4 border border-slate-600 rounded-full opacity-50" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Current position indicator - positioned relative to current rank */}
            {animationPhase === 'arrived' && (
              <div 
                className="absolute right-2 text-xs text-slate-400 bg-slate-800/80 px-2 py-1 rounded z-10"
                style={{ top: `${currentRankPosition + 40}px`, transform: 'translateY(-50%)' }}
              >
                You are here! →
              </div>
            )}
          </div>

          {/* Progress summary */}
          <div className="mt-4 text-center">
            <p className="text-slate-300 text-sm">
              {rankData.currentUserRank >= 8 ? (
                <>🔥 Elite level achieved! You're among the puzzle masters!</>
              ) : rankData.currentUserRank >= 5 ? (
                <>🚀 Excellent progress! You're climbing toward mastery!</>
              ) : rankData.currentUserRank >= 3 ? (
                <>💪 Great work! Keep solving to reach new heights!</>
              ) : (
                <>⭐ You're building skills! Each puzzle brings progress!</>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}