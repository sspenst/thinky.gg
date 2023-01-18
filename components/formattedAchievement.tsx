import React from 'react';
import AchievementType from '../constants/achievementType';

interface FormattedAchievementProps {
  achievementType: AchievementType;
}

export default function FormattedAchievement({ achievementType }: FormattedAchievementProps) {
  switch (achievementType) {
  case AchievementType.COMPLETED_LEVELS_100:
    return (<div>
      {'Completed 100 levels'}
    </div>);
  case AchievementType.COMPLETED_LEVELS_500:
    return (<div>
      {'Completed 500 levels'}
    </div>);
  case AchievementType.COMPLETED_LEVELS_1000:
    return (<div>
      {'Completed 1000 levels'}
    </div>);
  case AchievementType.COMPLETED_LEVELS_2000:
    return (<div>
      {'Completed 2000 levels'}
    </div>);
  case AchievementType.COMPLETED_LEVELS_3000:
    return (<div>
      {'Completed 3000 levels'}
    </div>);
  case AchievementType.COMPLETED_LEVELS_4000:
    return (<div>
      {'Completed 4000 levels'}
    </div>);
  default:
    return (<div>
      {'Achievement not found'}
    </div>);
  }
}
