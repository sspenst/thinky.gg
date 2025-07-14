import AchievementType from '@root/constants/achievements/achievementType';
import { Game } from '@root/constants/Games';
import Achievement from '@root/models/db/achievement';
import { useState } from 'react';
import AchievementCard from './achievementCard';

interface AchievementCategorySectionProps {
  categoryName: string;
  achievements: Array<{
    type: AchievementType;
    isUnlocked: boolean;
    achievement?: Achievement;
  }>;
  unlockedCount: number;
  totalCount: number;
  viewMode: 'grid' | 'list';
  game: Game;
  statsMap: Map<string, { count: number; firstEarned: Date; lastEarned: Date }>;
}

export default function AchievementCategorySection({
  categoryName,
  achievements,
  unlockedCount,
  totalCount,
  viewMode,
  game,
  statsMap,
}: AchievementCategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const progressPercentage = Math.round((unlockedCount / totalCount) * 100);

  return (
    <div className='bg-2 rounded-xl border border-color-3 overflow-hidden'>
      {/* Category Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className='w-full px-6 py-4 bg-3 hover:bg-4 transition-colors flex items-center justify-between'
      >
        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-2'>
            <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
            <h2 className='text-xl font-bold'>{categoryName}</h2>
          </div>
          <div className='text-sm opacity-75'>
            {unlockedCount} of {totalCount}
          </div>
        </div>
        
        <div className='flex items-center gap-4'>
          <div className='text-right'>
            <div className='text-sm font-semibold'>{progressPercentage}%</div>
            <div className='w-20 h-2 bg-color-base rounded-full overflow-hidden'>
              <div
                className='h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500'
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </button>
      {/* Achievement Grid/List */}
      {isExpanded && (
        <div className='p-6'>
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-3'
            }
          >
            {achievements.map(({ type, isUnlocked, achievement }) => (
              <AchievementCard
                key={type}
                achievementType={type}
                isUnlocked={isUnlocked}
                achievement={achievement}
                game={game}
                viewMode={viewMode}
                stats={statsMap.get(type)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
