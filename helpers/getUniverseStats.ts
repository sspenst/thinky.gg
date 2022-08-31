// TODO: https://github.com/sspenst/pathology/issues/169
// ignoring because this is only used in catalog page which we will eventually deprecate
/* istanbul ignore file */

import Stat from '../models/db/stat';
import SelectOptionStats from '../models/selectOptionStats';
import { UserWithLevels } from '../pages/catalog/[index]';

export default function getUniverseStats(
  stats: Stat[] | undefined,
  usersWithLevels: UserWithLevels[],
) {
  const universeStats: SelectOptionStats[] = [];

  for (let i = 0; i < usersWithLevels.length; i++) {
    const levelIds = usersWithLevels[i].levels;

    if (!levelIds) {
      universeStats.push(new SelectOptionStats(0, 0));
    } else if (!stats) {
      universeStats.push(new SelectOptionStats(levelIds.length, undefined));
    } else {
      let complete = 0;
      let count = 0;

      for (let i = 0; i < levelIds.length; i++) {
        const stat = stats.find(stat => stat.levelId === levelIds[i]);

        if (stat && stat.complete) {
          complete += 1;
        }

        count += 1;
      }

      universeStats.push(new SelectOptionStats(count, complete));
    }
  }

  return universeStats;
}
