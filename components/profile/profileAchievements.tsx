import { AchievementRulesTableCreator } from '@root/constants/achievements/AchievementRulesTableCreator';
import { AchievementRulesTableLevelCompletion } from '@root/constants/achievements/AchievementRulesTableLevelCompletion';
import { AchievementRulesTableMultiplayer } from '@root/constants/achievements/AchievementRulesTableMultiplayer';
import { AchievementRulesTableReviewer } from '@root/constants/achievements/AchievementRulesTableReviewer';
import { AchievementRulesTableUser } from '@root/constants/achievements/AchievementRulesTableUser';
import AchievementType from '@root/constants/achievements/achievementType';
import Achievement from '@root/models/db/achievement';
import React from 'react';
import FormattedAchievement from '../formatted/formattedAchievement';

export function ProfileAchievments({ achievements }: { achievements: Achievement[] }) {
  function getAchievementsOfCategory(rule: any) {
    return Object.keys(rule).map(achievementType => {
      const achievement = achievements.find(achievement => achievement.type === achievementType);

      return (
        <FormattedAchievement
          achievementType={achievementType as AchievementType}
          createdAt={achievement?.createdAt}
          key={`achievement-${achievementType}`}
        />
      );
    }).filter(achievement => achievement !== null);
  }

  const achievementsByCategory = {
    'Progress': getAchievementsOfCategory(AchievementRulesTableUser),
    'Creator': getAchievementsOfCategory(AchievementRulesTableCreator),
    'Skill': getAchievementsOfCategory(AchievementRulesTableLevelCompletion),
    'Reviewer': getAchievementsOfCategory(AchievementRulesTableReviewer),
    'Multiplayer': getAchievementsOfCategory(AchievementRulesTableMultiplayer),
  } as { [key: string]: JSX.Element[] };

  return (
    <div className='flex flex-col gap-6 items-center'>
      {Object.keys(achievementsByCategory).map((achievementCategory) => (
        <div className='flex flex-col gap-4 w-96 max-w-full' key={achievementCategory}>
          <h1 className='text-2xl font-medium'>{achievementCategory}</h1>
          {achievementsByCategory[achievementCategory]}
        </div>
      ))}
    </div>
  );
}
