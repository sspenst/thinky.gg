import { ObjectId } from 'bson';
import TestId from '../../constants/testId';
import filterSelectOptions, { FilterSelectOption } from '../../helpers/filterSelectOptions';
import getFormattedDate from '../../helpers/getFormattedDate';
import getProfileSlug from '../../helpers/getProfileSlug';
import getSWRKey from '../../helpers/getSWRKey';
import getTs from '../../helpers/getTs';
import getUniverseStats from '../../helpers/getUniverseStats';
import isOnline from '../../helpers/isOnline';
import naturalSort from '../../helpers/naturalSort';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';
import Stat from '../../models/db/stat';
import { UserModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';
import { UserWithLevels } from '../../pages/catalog/[index]';

describe('helpers/*.ts', () => {
  test('getUniverseStats', async () => {
    const levelId = new ObjectId();
    const stats = [
      {
        complete: true,
        levelId: levelId,
      },
    ] as Stat[];
    const usersWithLevels = [
      {
        levels: [levelId],
      },
      {
        levels: [new ObjectId()],
      },
      {
        levels: undefined,
      },
    ] as UserWithLevels[];

    let universeStats = getUniverseStats(undefined, usersWithLevels);

    expect(universeStats.length).toBe(3);
    expect(universeStats[0].userTotal).toBeUndefined();

    universeStats = getUniverseStats(stats, usersWithLevels);

    expect(universeStats.length).toBe(3);
    expect(universeStats[0].userTotal).toBe(1);
    expect(universeStats[1].userTotal).toBe(0);
    expect(universeStats[2].total).toBe(0);
    expect(universeStats[2].userTotal).toBe(0);
  });
  test('getFormattedDate', async () => {
    // create a date for two days in the past
    const date = new Date();

    date.setDate(date.getDate() - 2);
    const formattedDate = getFormattedDate(date.getTime() / 1000);

    expect(formattedDate).toBe('2 days ago');
  });
  test('naturalSort', async () => {
    const obj = [
      {
        name: '1. a',
      },
      {
        name: '2. b',
      },
      {
        name: '10. c',
      },
      {
        name: '3. d',
      },
    ];
    const sorted = naturalSort(obj);

    expect(sorted[0].name).toBe('1. a');
    expect(sorted[1].name).toBe('2. b');
    expect(sorted[2].name).toBe('3. d');
    expect(sorted[3].name).toBe('10. c');
  });
  test('getProfileSlug', async () => {
    await dbConnect();
    const user = await UserModel.findById(TestId.USER);
    const slug = getProfileSlug(user);

    expect(slug).toBe('/profile/test');
  });
  test('isOnline', async () => {
    await dbConnect();
    const user = await UserModel.findById(TestId.USER);
    const online = isOnline(user);

    expect(online).toBe(true);
    user.last_visited_at = getTs() - 15 * 60 * 2;
    await user.save();
    const online2 = isOnline(user);

    expect(online2).toBe(false);
    await dbDisconnect();
  });
  test('getSWRKey', () => {
    const key = getSWRKey('/api/statistics');

    expect(key).toBe('@"/api/statistics",undefined,');
  });
  test('filterSelectOptions', () => {
    const selectOptions = [
      {
        stats: new SelectOptionStats(7, 7),
        text: 'complete',
      },
      {
        stats: new SelectOptionStats(9, 1),
        text: 'in progress',
      },
      {
        stats: new SelectOptionStats(5, 0),
        text: 'not started',
      },
    ] as SelectOption[];

    let options = filterSelectOptions(selectOptions, FilterSelectOption.All, '');

    expect(options.length).toBe(3);

    options = filterSelectOptions(selectOptions, FilterSelectOption.HideWon, '');

    expect(options.length).toBe(2);
    expect(options[0].text).toBe('in progress');

    options = filterSelectOptions(selectOptions, FilterSelectOption.ShowInProgress, '');

    expect(options.length).toBe(1);
    expect(options[0].text).toBe('in progress');

    options = filterSelectOptions(selectOptions, FilterSelectOption.All, 'start');

    expect(options.length).toBe(1);
    expect(options[0].text).toBe('not started');
  });
});

export {};
