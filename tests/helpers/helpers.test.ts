import StatFilter from '@root/constants/statFilter';
import TileType from '@root/constants/tileType';
import { generatePassword } from '@root/helpers/generatePassword';
import { parseHostname, parseSubdomain } from '@root/helpers/parseUrl';
import { validatePathologyLevelValid } from '@root/helpers/validators/validatePathology';
import { validateSokobanLevel } from '@root/helpers/validators/validateSokoban';
import TestId from '../../constants/testId';
import statFilterOptions from '../../helpers/filterSelectOptions';
import getDifficultyEstimate from '../../helpers/getDifficultyEstimate';
import getProfileSlug from '../../helpers/getProfileSlug';
import getSWRKey from '../../helpers/getSWRKey';
import { TimerUtil } from '../../helpers/getTs';
import isOnline from '../../helpers/isOnline';
import naturalSort from '../../helpers/naturalSort';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';
import Level from '../../models/db/level';
import User from '../../models/db/user';
import { UserModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
describe('helpers/*.ts', () => {
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

    const objWithoutName = [
      {
        name: '1. a',
      },
      {
        blah: '2. b',
      },
      {
        name: '10. c',
      },
      {
        name: '3. d',
      },
    ];
    const sorted2 = naturalSort(objWithoutName as { name: string }[]);

    expect(sorted2[0].name).toBe('1. a');
    expect(sorted2[1].name).toBe('3. d');
    expect(sorted2[2].name).toBe('10. c');
    expect(sorted2[3]).toStrictEqual({ blah: '2. b' });
  });
  test('getProfileSlug', async () => {
    const user = await UserModel.findById(TestId.USER);
    const slug = getProfileSlug(user);

    expect(slug).toBe('/profile/test');
  });
  test('isOnline', async () => {
    const user = await UserModel.findOneAndUpdate({ _id: TestId.USER },
      {
        $set:
        {
          last_visited_at: TimerUtil.getTs() - 5 * 60 * 2
        },
      }
    ) as User;

    expect(isOnline(user)).toBe(true);
    user.last_visited_at = TimerUtil.getTs() - 5 * 60 * 2;

    expect(isOnline(user)).toBe(false);
    user.last_visited_at = undefined;
    expect(isOnline(user)).toBe(false);
  });
  test('getSWRKey', () => {
    const key = getSWRKey('/api/asdf');

    expect(key).toBe('@"/api/asdf",undefined,');
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

    let options = statFilterOptions(selectOptions, StatFilter.All, '');

    expect(options.length).toBe(5);

    options = statFilterOptions(selectOptions, StatFilter.HideSolved, '');

    expect(options.length).toBe(3);
    expect(options[0].text).toBe('in progress');

    options = statFilterOptions(selectOptions, StatFilter.InProgress, '');

    expect(options.length).toBe(1);
    expect(options[0].text).toBe('in progress');

    options = statFilterOptions(selectOptions, StatFilter.All, 'complete');

    expect(options.length).toBe(1);
    expect(options[0].text).toBe('complete');
  });
  test('getDifficultyEstimate', async () => {
    const level = {
      calc_playattempts_duration_sum: 800,
      calc_playattempts_just_beaten_count: 1,
    } as Partial<Level>;

    expect(getDifficultyEstimate(level, 8)).toBe(-1);
    expect(getDifficultyEstimate(level, 10)).toBeCloseTo(800 * 1.48906);

    level.calc_playattempts_just_beaten_count = 0;

    expect(getDifficultyEstimate(level, 8)).toBe(-1);
    expect(getDifficultyEstimate(level, 10)).toBeCloseTo(800 * 1.48906);

    level.calc_playattempts_duration_sum = 0;

    expect(getDifficultyEstimate(level, 10)).toBe(0);
  });
  test('generatePassword', async () => {
    const password = generatePassword();

    expect(password.length).toBeGreaterThan(0);
  });
  test('parseSubdomain', async () => {
    expect(parseSubdomain('https://asdf.test.com')).toBe('asdf');
    expect(parseSubdomain('https://test.com')).toBe(null);
    expect(parseSubdomain('http://test.localhost')).toBe('test');
    expect(parseSubdomain('http://test.localhost:3000')).toBe('test');
    expect(parseSubdomain('test.localhost')).toBe('test');
    expect(parseSubdomain('localhost')).toBe(null);
    expect(parseSubdomain('')).toBe(null);
  });
  test('getOnlyHostname', async () => {
    expect(parseHostname('https://asdf.test.com')).toBe('test.com');
    expect(parseHostname('https://asdf.vahh.test.com')).toBe('test.com');
    expect(parseHostname('https://test.com')).toBe('test.com');
    expect(parseHostname('http://test.localhost')).toBe('localhost');
    expect(parseHostname('http://blah.test.localhost')).toBe('localhost');
    expect(parseHostname('http://test.localhost:3000')).toBe('localhost');
    expect(parseHostname('test.localhost')).toBe('localhost');
    expect(parseHostname('localhost')).toBe('localhost');
    expect(parseHostname('')).toBe(null);
  });
  test('validatePathologyLevelValid', async () => {
    const emptyGrid = '000';
    const gridWithOnlyOneStart = '00' + TileType.Player;
    const gridWithOneStartAndOneEnd = '00' + TileType.Player + TileType.Exit;

    expect(validatePathologyLevelValid(emptyGrid).reasons).toMatchObject(['Must have exactly one start block', 'Need end tile']);
    expect(validatePathologyLevelValid(gridWithOnlyOneStart).reasons).toMatchObject(['Need end tile']);
    expect(validatePathologyLevelValid(gridWithOneStartAndOneEnd).valid).toBe(true);
  });
  test('validiateSokobanLevelValid', async () => {
    const emptyGrid = '000';
    const gridWithOnlyOneStart = '00' + TileType.Player;
    const gridWithOneStartAndOneEnd = '00' + TileType.Player + TileType.Exit;
    const gridWithOneStartAndOneEndWithBlockOnTop = '00' + TileType.Player + TileType.BlockOnExit;

    expect(validateSokobanLevel(emptyGrid).reasons).toMatchObject(['Must have exactly one start block', 'Must have at least one end']);
    expect(validateSokobanLevel(gridWithOnlyOneStart).reasons).toMatchObject(['Must have at least one end']);
    expect(validateSokobanLevel(gridWithOneStartAndOneEnd).reasons).toMatchObject(['Must have as many blocks as ends']);
    expect(validateSokobanLevel(gridWithOneStartAndOneEndWithBlockOnTop).valid).toBe(true);
  });
});

export { };
