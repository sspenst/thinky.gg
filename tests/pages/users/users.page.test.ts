import { GameId } from '@root/constants/GameId';
import TestId from '@root/constants/testId';
import { Aggregate } from 'mongoose';
import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import { logger } from '../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { UserConfigModel, UserModel } from '../../../models/mongoose';
import { DEFAULT_QUERY, getServerSideProps } from '../../../pages/[subdomain]/users/index';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('pages/users page', () => {
  test('getServerSideProps not logged in and with no params', async () => {
    const ret = await getServerSideProps({} as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props.searchQuery).toStrictEqual(DEFAULT_QUERY);
    expect(ret.props.totalRows).toBe(6);
    expect(ret.props.users[0].reviewCount).toBeUndefined();
  }
  );
  test('getServerSideProps get null from users', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(UserModel, 'aggregate').mockImplementation(() => {
      return null as unknown as Aggregate<unknown[]>;
    });
    await expect(() => getServerSideProps({} as GetServerSidePropsContext)).rejects.toThrow('Error querying users');
  }
  );

  test('Ranked Solves ties are ordered by name', async () => {
    const tiedUserIds = [TestId.USER_B, TestId.USER_C];

    await UserConfigModel.updateMany({
      gameId: GameId.PATHOLOGY,
      userId: { $in: tiedUserIds },
    }, {
      $set: { calcRankedSolves: 99 },
    });

    try {
      const ret = await getServerSideProps({
        req: {
          headers: { host: 'pathology.localhost:3000' },
        },
        query: {
          sortBy: 'calcRankedSolves',
          sortDir: 'desc',
        },
      } as unknown as GetServerSidePropsContext);

      expect(ret.props.users.slice(0, 2).map(user => user.name)).toEqual(['BBB', 'Curator']);
      expect(ret.props.users.slice(0, 2).map(user => user.calcRankedSolves)).toEqual([99, 99]);
    } finally {
      await UserConfigModel.updateMany({
        gameId: GameId.PATHOLOGY,
        userId: { $in: tiedUserIds },
      }, {
        $set: { calcRankedSolves: 0 },
      });
    }
  });
});
