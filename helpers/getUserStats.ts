// TODO: https://github.com/sspenst/pathology/issues/169
// ignoring because this is only used in catalog page which we will eventually deprecate
/* istanbul ignore file */

import Stat from '../models/db/stat';
import SelectOptionStats from '../models/selectOptionStats';
import { UserWithLevels } from '../pages/catalog/[[...route]]';

export default function getUserStats(
  stats: Stat[] | undefined,
  usersWithLevels: UserWithLevels[],
) {
  const userStats: SelectOptionStats[] = [];

  for (let i = 0; i < usersWithLevels.length; i++) {
    const levelIds = usersWithLevels[i].levels;

    if (!levelIds) {
      userStats.push(new SelectOptionStats(0, 0));
    } else if (!stats) {
      userStats.push(new SelectOptionStats(levelIds.length, undefined));
    } else {
      let solved = 0;
      let count = 0;

      for (let i = 0; i < levelIds.length; i++) {
        const stat = stats.find(stat => stat.levelId === levelIds[i]);

        if (stat && stat.complete) {
          solved += 1;
        }

        count += 1;
      }

      userStats.push(new SelectOptionStats(count, solved));
    }
  }

  return userStats;
}
