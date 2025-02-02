import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { DIFFICULTY_INDEX, getDifficultyColor, getDifficultyRangeByIndex } from '@root/components/formatted/formattedDifficulty';
import FormattedUser from '@root/components/formatted/formattedUser';
import Page from '@root/components/page/page';
import { GameId } from '@root/constants/GameId';
import { GameType } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import { UserAndSum } from '@root/contexts/levelContext';
import { getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import { getGameFromId, getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import cleanUser from '@root/lib/cleanUser';
import { getUserFromToken } from '@root/lib/withAuth';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import User from '@root/models/db/user';
import { LevelModel, StatModel, UserModel } from '@root/models/mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import React, { Fragment, useContext, useState } from 'react';

async function getDifficultyLeaderboard(gameId: GameId, index: DIFFICULTY_INDEX) {
  const difficultyRange = getDifficultyRangeByIndex(index);
  const game = getGameFromId(gameId);
  const difficultyEstimate = game.type === GameType.COMPLETE_AND_SHORTEST ? 'calc_difficulty_completion_estimate' : 'calc_difficulty_estimate';

  // Optimize the aggregation pipeline
  const agg = await LevelModel.aggregate([
    {
      $match: {
        isDraft: false,
        isDeleted: { $ne: true },
        gameId: gameId,
        [difficultyEstimate]: { $gte: difficultyRange[0] }
      }
    },
    {
      // Use $lookup with a more efficient pipeline
      $lookup: {
        from: StatModel.collection.name,
        let: { levelId: '$_id' },
        pipeline: [{
          $match: {
            $expr: {
              $and: [
                { $eq: ['$levelId', '$$levelId'] },
                { $eq: ['$complete', true] }
              ]
            },
          }
        }, {
          $group: {
            _id: '$userId'
          }
        }],
        as: 'stat'
      }
    },
    {
      $unwind: '$stat'
    },
    {
      $group: {
        _id: '$stat._id',
        sum: { $sum: 1 }
      }
    },
    {
      $match: {
        sum: { $gte: 7 }
      }
    },
    {
      // Optimize user lookup by moving it after filtering
      $lookup: {
        from: UserModel.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          {
            $project: USER_DEFAULT_PROJECTION
          },
          ...getEnrichUserConfigPipelineStage(gameId, { excludeCalcs: true })
        ]
      }
    },
    {
      $unwind: '$user'
    },
    {
      $sort: {
        sum: -1,
        'user.name': 1
      }
    },
    {
      $limit: 100
    }
  ]) as UserAndSum[];

  // Clean users in batch instead of loop
  const users = agg.map(item => item.user);

  users.forEach(cleanUser);

  return agg;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const gameId = getGameIdFromReq(context.req);
  const game = getGameFromId(gameId);

  // Optimize by conditionally fetching data
  const reqUserPromise = token ? getUserFromToken(token, context.req as NextApiRequest) : Promise.resolve(null);

  const promises: Promise<any>[] = [
    getDifficultyLeaderboard(gameId, DIFFICULTY_INDEX.GRANDMASTER),
    getDifficultyLeaderboard(gameId, DIFFICULTY_INDEX.SUPER_GRANDMASTER),
    reqUserPromise
  ];

  // Only fetch ranked leaderboard if needed
  if (!game.disableRanked) {
    promises.push(UserModel.aggregate<User>([
      {
        $project: USER_DEFAULT_PROJECTION
      },
      ...getEnrichUserConfigPipelineStage(gameId),
      {
        $match: {
          'config.calcRankedSolves': { $gt: 0 }
        }
      },
      {
        $sort: {
          'config.calcRankedSolves': -1
        }
      },
      {
        $limit: 40
      }
    ]).then(users => {
      users.forEach(cleanUser);

      return users;
    }));
  }

  const [gmLeaderboard, sgmLeaderboard, reqUser, rankedLeaderboard = null] = await Promise.all(promises);

  return {
    props: {
      gmLeaderboard: JSON.parse(JSON.stringify(gmLeaderboard)),
      rankedLeaderboard: JSON.parse(JSON.stringify(rankedLeaderboard)),
      reqUser: JSON.parse(JSON.stringify(reqUser)),
      sgmLeaderboard: JSON.parse(JSON.stringify(sgmLeaderboard)),
    },
  };
}

interface LeaderboardsProps {
  gmLeaderboard: UserAndSum[];
  rankedLeaderboard: User[] | null;
  reqUser: User | null;
  sgmLeaderboard: UserAndSum[];
}

export default function Leaderboards({ gmLeaderboard, rankedLeaderboard, reqUser, sgmLeaderboard }: LeaderboardsProps) {
  const { game } = useContext(AppContext);
  const [leaderboard, setLeaderboard] = useState(!game.disableRanked ? 'ranked' : 'sgm');
  const gmRange = getDifficultyRangeByIndex(DIFFICULTY_INDEX.GRANDMASTER);
  const sgmRange = getDifficultyRangeByIndex(DIFFICULTY_INDEX.SUPER_GRANDMASTER);
  const gmColor = getDifficultyColor(gmRange[0]);
  const sgmColor = getDifficultyColor(sgmRange[0]);

  const leaderboardStrings = {
    ...(!game.disableRanked ? { 'ranked': 'Ranked 🏅' } : {}),
    'sgm': 'Super Grandmasters 🧠',
    'gm': 'Grandmasters 📜',
  } as { [key: string]: string };

  function getLeaderboardTable(users: User[], values: number[]) {
    return (
      <div className='grid gap-2 items-center' style={{
        gridTemplateColumns: 'min-content 1fr min-content',
      }}>
        {users.map((user, i) => {
          const isYou = reqUser && user._id === reqUser._id;
          // Memoize the highlight style
          const highlightStyle = isYou ? {
            boxShadow: '0 0 10px 2px rgba(255, 100, 0, 0.6), 0 0 20px 2px rgba(255, 150, 0, 0.7), 0 0 32px 4px rgba(255, 200, 0, 0.8)',
            paddingLeft: '4px',
            paddingRight: '4px',
          } : undefined;

          return (
            <React.Fragment key={user._id.toString()}>
              <div className='font-bold text-xl'>
                {i + 1}.
              </div>
              <div className='flex items-center text-lg gap-3 rounded-lg truncate'>
                <FormattedUser id='ranked' size={32} user={user} />
              </div>
              <div
                className='ml-2 font-medium text-lg rounded-md'
                style={highlightStyle}
              >
                {values[i]}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  function getLeaderboard() {
    if (leaderboard === 'ranked') {
      if (game.disableRanked || !rankedLeaderboard) {
        return null;
      }

      return (
        <div className='flex flex-col text-center gap-6'>
          <div className='flex justify-center'>
            <Link className='font-bold text-2xl hover:underline w-fit' href='/ranked'>Ranked Solves 🏅</Link>
          </div>
          {getLeaderboardTable(rankedLeaderboard, rankedLeaderboard.map(user => user.config?.calcRankedSolves || 0))}
        </div>
      );
    } else if (leaderboard === 'sgm') {
      return (
        <div className='flex flex-col items-center text-center gap-4'>
          <span className='font-bold italic text-lg' style={{ color: sgmColor }}>{game.displayName} Super Grandmasters</span>
          <span className='text-sm'>Super Grandmasters have solved at minimum 7 Super Grandmaster levels</span>
          {getLeaderboardTable(sgmLeaderboard.map(userAndSum => userAndSum.user), sgmLeaderboard.map(userAndSum => userAndSum.sum))}
        </div>
      );
    } else if (leaderboard === 'gm') {
      return (
        <div className='flex flex-col items-center text-center gap-4'>
          <span className='font-bold italic text-lg' style={{ color: gmColor }}>{game.displayName} Grandmasters</span>
          <span className='text-sm'>Grandmasters have solved at minimum 7 Grandmaster (or harder) levels</span>
          {getLeaderboardTable(gmLeaderboard.map(userAndSum => userAndSum.user), gmLeaderboard.map(userAndSum => userAndSum.sum))}
        </div>
      );
    } else {
      return null;
    }
  }

  return (
    <Page title={game.displayName + ' Leaderboards'}>
      <div className='p-6 flex flex-col items-center gap-6'>
        <h2 className='text-3xl font-bold text-center'>{game.displayName} Leaderboards</h2>
        <Menu as='div' className='relative inline-block text-left w-fit'>
          <MenuButton
            aria-expanded='true'
            aria-haspopup='true'
            className='flex items-center w-full justify-center rounded-md bg-white pl-2 pr-1 py-1 text-xl font-medium text-black gap-1 shadow-md border'
            id='menu-button'
            style={{
              borderColor: 'var(--bg-color-3)',
            }}
          >
            {leaderboardStrings[leaderboard]}
            <svg className='h-5 w-5' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
              <path fillRule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clipRule='evenodd' />
            </svg>
          </MenuButton>
          <Transition
            as={Fragment}
            enter='transition ease-out duration-100'
            enterFrom='transform opacity-0 scale-95'
            enterTo='transform opacity-100 scale-100'
            leave='transition ease-in duration-75'
            leaveFrom='transform opacity-100 scale-100'
            leaveTo='transform opacity-0 scale-95'
          >
            <MenuItems className='absolute right-0 z-10 mt-1 rounded-md overflow-hidden border bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border-color-1'>
              <div>
                {Object.keys(leaderboardStrings).map(leaderboardKey => {
                  return (
                    <MenuItem key={`leaderboard-${leaderboardKey}`}>
                      <button
                        className='text-black p-1 text-xl font-medium w-64 flex items-center gap-1 justify-center data-[active]:bg-neutral-300'
                        onClick={() => setLeaderboard(leaderboardKey)}
                        role='menuitem'
                      >
                        {leaderboardStrings[leaderboardKey]}
                      </button>
                    </MenuItem>
                  );
                })}
              </div>
            </MenuItems>
          </Transition>
        </Menu>
        {getLeaderboard()}
      </div>
    </Page>
  );
}
