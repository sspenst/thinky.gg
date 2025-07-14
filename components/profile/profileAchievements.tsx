import { AchievementCategoryMapping } from '@root/constants/achievements/achievementInfo';
import AchievementType from '@root/constants/achievements/achievementType';
import { AppContext } from '@root/contexts/appContext';
import Achievement from '@root/models/db/achievement';
import Link from 'next/link';
import React, { useContext, useState } from 'react';
import FormattedAchievement from '../formatted/formattedAchievement';

export function ProfileAchievments({ achievements }: { achievements: Achievement[] }) {
  const { game } = useContext(AppContext);
  const [showAll, setShowAll] = useState(false);

  // Create achievement map for quick lookup
  const achievementMap = new Map<string, Achievement>();

  achievements.forEach(achievement => {
    achievementMap.set(achievement.type, achievement);
  });

  // Calculate total achievements and unlocked count
  const totalAchievements = Object.values(AchievementCategoryMapping).reduce(
    (total, categoryRules) => total + Object.keys(categoryRules).length,
    0
  );
  const unlockedCount = achievements.length;
  const progressPercentage = Math.round((unlockedCount / totalAchievements) * 100);

  function getAchievementsOfCategory(categoryRules: Record<string, unknown>) {
    const categoryAchievements = Object.keys(categoryRules);
    const unlockedInCategory = categoryAchievements.filter(type => achievementMap.has(type)).length;

    // Show recent achievements first, then locked ones
    const sortedAchievements = categoryAchievements.sort((a, b) => {
      const achievementA = achievementMap.get(a);
      const achievementB = achievementMap.get(b);

      if (achievementA && achievementB) {
        return new Date(achievementB.createdAt).getTime() - new Date(achievementA.createdAt).getTime();
      }

      if (achievementA && !achievementB) return -1;
      if (!achievementA && achievementB) return 1;

      return 0;
    });

    const displayAchievements = showAll ? sortedAchievements : sortedAchievements.slice(0, 6);

    return {
      achievements: displayAchievements.map(achievementType => {
        const achievement = achievementMap.get(achievementType);

        return (
          <FormattedAchievement
            achievementType={achievementType as AchievementType}
            createdAt={achievement?.createdAt}
            game={game}
            key={`achievement-${achievementType}`}
          />
        );
      }),
      unlockedInCategory,
      totalInCategory: categoryAchievements.length,
      hasMore: categoryAchievements.length > 6
    };
  }

  const categories = game.isNotAGame
    ? { 'SOCIAL': 'Social Achievements' }
    : {
      'USER': 'Progress',
      'CREATOR': 'Creator',
      'LEVEL_COMPLETION': 'Skill',
      'REVIEWER': 'Reviewer',
      'MULTIPLAYER': 'Multiplayer'
    };

  return (
    <div className='space-y-6 p-3'>
      {/* Overall Progress */}
      <div className='bg-2 rounded-xl p-6 border border-color-3'>
        <div className='flex flex-col sm:flex-row items-center justify-between gap-4 mb-4'>
          <div>
            <h2 className='text-xl font-bold'>Achievement Progress</h2>
            <p className='text-sm opacity-75'>
              {unlockedCount} of {totalAchievements} achievements unlocked
            </p>
          </div>
          <div className='flex items-center gap-4'>
            <div className='text-2xl font-bold text-blue-500'>{progressPercentage}%</div>
            <div className='w-32 h-3 bg-3 rounded-full overflow-hidden'>
              <div
                className='h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500'
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className='flex gap-2'>
          <Link
            href='/achievements'
            className='px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium'
          >
            View All Achievements
          </Link>
          <button
            onClick={() => setShowAll(!showAll)}
            className='px-4 py-2 bg-3 hover:bg-4 rounded-lg transition-colors text-sm font-medium'
          >
            {showAll ? 'Show Less' : 'Show All'}
          </button>
        </div>
      </div>
      {/* Achievement Categories */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {Object.entries(categories).map(([categoryKey, categoryName]) => {
          const categoryRules = AchievementCategoryMapping[categoryKey];

          if (!categoryRules) return null;

          const { achievements: categoryAchievements, unlockedInCategory, totalInCategory, hasMore } =
            getAchievementsOfCategory(categoryRules);

          const categoryProgress = Math.round((unlockedInCategory / totalInCategory) * 100);

          return (
            <div key={categoryKey} className='bg-2 rounded-xl border border-color-3 overflow-hidden'>
              <div className='px-4 py-3 bg-3 border-b border-color-4'>
                <div className='flex items-center justify-between'>
                  <h3 className='font-bold text-lg'>{categoryName}</h3>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-medium'>{unlockedInCategory}/{totalInCategory}</span>
                    <div className='w-16 h-2 bg-color-base rounded-full overflow-hidden'>
                      <div
                        className='h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500'
                        style={{ width: `${categoryProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className='p-4 space-y-3'>
                {categoryAchievements}
                {!showAll && hasMore && (
                  <div className='text-center pt-2'>
                    <button
                      onClick={() => setShowAll(true)}
                      className='text-blue-500 hover:text-blue-600 text-sm font-medium'
                    >
                      +{totalInCategory - 6} more achievements
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
