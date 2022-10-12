import { ObjectId } from 'bson';
import TestId from '../../constants/testId';
import filterSelectOptions, { FilterSelectOption } from '../../helpers/filterSelectOptions';
import getFormattedDate from '../../helpers/getFormattedDate';
import getProfileSlug from '../../helpers/getProfileSlug';
import getSWRKey from '../../helpers/getSWRKey';
import { TimerUtil } from '../../helpers/getTs';
import getUserStats from '../../helpers/getUserStats';
import isOnline from '../../helpers/isOnline';
import naturalSort from '../../helpers/naturalSort';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';
import Stat from '../../models/db/stat';
import { UserModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';
import { UserWithLevels } from '../../pages/catalog/[index]';

describe('helpers/*.ts', () => {
  test('getUserStats', async () => {
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

    let userStats = getUserStats(undefined, usersWithLevels);

    expect(userStats.length).toBe(3);
    expect(userStats[0].userTotal).toBeUndefined();

    userStats = getUserStats(stats, usersWithLevels);

    expect(userStats.length).toBe(3);
    expect(userStats[0].userTotal).toBe(1);
    expect(userStats[1].userTotal).toBe(0);
    expect(userStats[2].total).toBe(0);
    expect(userStats[2].userTotal).toBe(0);
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

    expect(isOnline(user)).toBe(true);
    user.last_visited_at = TimerUtil.getTs() - 15 * 60 * 2;
    await user.save();
    expect(isOnline(user)).toBe(false);
    user.last_visited_at = undefined;
    expect(isOnline(user)).toBe(false);
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
      },
      {
        text: 'empty',
      },
      {
        stats: new SelectOptionStats(10, undefined),
        text: 'no user total',
      },
    ] as SelectOption[];

    let options = filterSelectOptions(selectOptions, FilterSelectOption.All, '');

    expect(options.length).toBe(5);

    options = filterSelectOptions(selectOptions, FilterSelectOption.HideWon, '');

    expect(options.length).toBe(3);
    expect(options[0].text).toBe('in progress');

    options = filterSelectOptions(selectOptions, FilterSelectOption.ShowInProgress, '');

    expect(options.length).toBe(1);
    expect(options[0].text).toBe('in progress');

    options = filterSelectOptions(selectOptions, FilterSelectOption.All, 'complete');

    expect(options.length).toBe(1);
    expect(options[0].text).toBe('complete');
  });
});

export {};
