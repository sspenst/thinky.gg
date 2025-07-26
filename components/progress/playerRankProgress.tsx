import { difficultyList } from '@root/components/formatted/formattedDifficulty';
import LoadingSpinner from '@root/components/page/loadingSpinner';
import useSWRHelper from '@root/hooks/useSWRHelper';
import React from 'react';

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

  const currentRank = rankData.rankInfo.find(rank => rank.index === rankData.currentUserRank);
  const currentStats = rankData.stats[rankData.currentUserRank];
  const nextRank = rankData.rankInfo.find(rank => rank.index === rankData.currentUserRank + 1);
  const nextStats = rankData.stats[rankData.currentUserRank + 1];

  return (
    <div className={`bg-2 rounded-lg p-6 border border-color-3 ${className}`}>
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold mb-2">Your Progress</h3>
        <div className="text-sm text-gray-600">
          Among {rankData.totalActiveUsers.toLocaleString()} active players
        </div>
      </div>

      {/* Current Rank Display */}
      <div className="flex items-center justify-center mb-6 p-4 bg-1 rounded-lg border border-color-3">
        <div className="text-center">
          <div className="text-4xl mb-2">{currentRank?.emoji}</div>
          <div className="text-xl font-bold text-blue-500">{currentRank?.name}</div>
          <div className="text-sm text-gray-600 mt-1">{currentRank?.description}</div>
          {currentStats && (
            <div className="text-lg font-semibold mt-2 text-green-600">
              You've reached what {currentStats.percentile}% of players achieve
            </div>
          )}
        </div>
      </div>

      {/* Progress Visualization */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span>Rank Progression</span>
          {nextRank && (
            <span className="text-gray-600">
              Next: {nextRank.emoji} {nextRank.name}
            </span>
          )}
        </div>
        
        {/* Rank bars showing progression */}
        <div className="space-y-2">
          {rankData.rankInfo.slice(0, Math.min(5, rankData.rankInfo.length)).map((rank) => {
            const stats = rankData.stats[rank.index];
            const isCurrent = rank.index === rankData.currentUserRank;
            const isAchieved = rank.index <= rankData.currentUserRank;
            
            return (
              <div key={rank.index} className="flex items-center space-x-3">
                <div className={`w-8 text-center ${isCurrent ? 'text-2xl' : 'text-lg'}`}>
                  {rank.emoji}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-sm font-medium ${isCurrent ? 'text-blue-600 font-bold' : isAchieved ? 'text-green-600' : 'text-gray-600'}`}>
                      {rank.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {stats ? `${stats.percentile}% reach here` : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isCurrent ? 'bg-blue-500' : 
                        isAchieved ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                      style={{ 
                        width: stats ? `${Math.max(5, stats.percentile)}%` : '5%'
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Encouragement message */}
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-sm text-blue-800 text-center">
          {rankData.currentUserRank >= 8 ? (
            'Amazing! You\'re among the elite players! 🎉'
          ) : rankData.currentUserRank >= 5 ? (
            'Great job! You\'re becoming an expert! 🚀'
          ) : rankData.currentUserRank >= 3 ? (
            'Nice progress! Keep solving to advance! 💪'
          ) : (
            'Welcome! Solve more levels to climb the ranks! ⭐'
          )}
        </div>
      </div>
    </div>
  );
}