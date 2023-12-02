import { Menu, Transition } from '@headlessui/react';
import { DIFFICULTY_INDEX, getDifficultyColor, getDifficultyRangeByIndex } from '@root/components/formatted/formattedDifficulty';
import FormattedUser from '@root/components/formatted/formattedUser';
import Page from '@root/components/page/page';
import UserAndSumTable from '@root/components/tables/userAndSumTable';
import { UserAndSum } from '@root/contexts/levelContext';
import cleanUser from '@root/lib/cleanUser';
import { getUserFromToken } from '@root/lib/withAuth';
import User from '@root/models/db/user';
import { LevelModel, StatModel, UserModel } from '@root/models/mongoose';
import { USER_DEFAULT_PROJECTION } from '@root/models/schemas/userSchema';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React, { Fragment, useState } from 'react';

async function getDifficultyLeaderboard(index: DIFFICULTY_INDEX) {
  const difficultyRange = getDifficultyRangeByIndex(index);
  const agg = await LevelModel.aggregate([
    {
      $match: {
        isDraft: false,
        isDeleted: {
          $ne: true,
        },
        calc_difficulty_estimate: {
          $gte: difficultyRange[0],
        }
      }
    },
    // now get players that have solved these levels by checking stats where completed is true
    // and then group by user and count the number of levels they've solved
    {
      $lookup: {
        from: StatModel.collection.name,
        let: { levelId: '$_id' },
        pipeline: [{
          $match: {
            $expr: {
              $and: [
                { $eq: ['$levelId', '$$levelId'] },
                { $eq: ['$complete', true] },
              ]
            }
          },
        }, {
          $project: {
            userId: 1,
            complete: 1
          }
        }],
        as: 'stat',
      },
    },
    {
      $project: {
        'users': '$stat.userId'
      }
    },
    // now each element has a users array with the userIds of the users that have solved the level. We want to unwind this array and then group by userId and count the number of times they appear
    {
      $unwind: '$users'
    },
    {
      $group: {
        _id: '$users',
        sum: { $sum: 1 }
      }
    },
    {
      $sort: {
        count: -1,
      }
    },
    {
      $lookup: {
        from: UserModel.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          {
            $project: {
              ...USER_DEFAULT_PROJECTION
            }
          }
        ]
      }
    },
    {
      $unwind: '$user'
    },
    // move $user to the root, but keep the count
    {
      $match: {
        sum: {
          $gte: 7
        }
      }
    },
    {
      $sort: {
        sum: -1,
        'user.name': 1,
      }
    },
    {
      $limit: 100
    },
  ]) as UserAndSum[];

  // clean each one
  for (const userAndSum of agg) {
    cleanUser(userAndSum.user);
  }

  return agg;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  const [gmLeaderboard, rankedLeaderboard, sgmLeaderboard] = await Promise.all([
    getDifficultyLeaderboard(DIFFICULTY_INDEX.GRANDMASTER),
    UserModel.aggregate([
      {
        $project: {
          ...USER_DEFAULT_PROJECTION,
          calcRankedSolves: 1,
        },
      },
      {
        $sort: {
          calcRankedSolves: -1,
        },
      },
      {
        $limit: 40,
      },
    ]),
    getDifficultyLeaderboard(DIFFICULTY_INDEX.SUPER_GRANDMASTER),
  ]);

  rankedLeaderboard.forEach(user => {
    cleanUser(user);
  });

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
  rankedLeaderboard: User[];
  reqUser: User;
  sgmLeaderboard: UserAndSum[];
}

export default function Leaderboards({ gmLeaderboard, rankedLeaderboard, reqUser, sgmLeaderboard }: LeaderboardsProps) {
  const [leaderboard, setLeaderboard] = useState('ranked');

  const gmRange = getDifficultyRangeByIndex(DIFFICULTY_INDEX.GRANDMASTER);
  const sgmRange = getDifficultyRangeByIndex(DIFFICULTY_INDEX.SUPER_GRANDMASTER);
  const gmColor = getDifficultyColor(gmRange[0]);
  const sgmColor = getDifficultyColor(sgmRange[0]);

  const leaderboardStrings = {
    'ranked': 'Ranked Solves 🏅',
    'sgm': 'Super Grandmasters 🧠',
    'gm': 'Grandmasters 📜',
  } as { [key: string]: string };

  function getLeaderboard() {
    if (leaderboard === 'ranked') {
      return (
        <div className='grid gap-2 items-center' style={{
          gridTemplateColumns: 'repeat(3, min-content)',
        }}>
          {rankedLeaderboard.map((user, i) => {
            return (<>
              <div className='font-bold text-xl'>{i + 1}.</div>
              <div
                className='flex items-center text-lg gap-3 rounded-lg w-fit'
                key={`${user._id}-levels-solved`}
              >
                <FormattedUser id='ranked' size={32} user={user} />
              </div>
              <div className='ml-2 font-medium text-lg'>
                {user.calcRankedSolves}
              </div>
            </>);
          })}
        </div>
      );
    } else if (leaderboard === 'sgm') {
      return (
        <div className='flex flex-col text-center gap-1'>
          <span className='font-bold italic text-lg' style={{ color: sgmColor }}>Pathology Super Grandmasters</span>
          <span className='text-xs'>Super Grandmasters have solved at minimum 7 Super Grandmaster levels</span>
          <UserAndSumTable data={sgmLeaderboard} sumName='SGMs Solved' />
        </div>
      );
    } else if (leaderboard === 'gm') {
      return (
        <div className='flex flex-col text-center gap-1'>
          <span className='font-bold italic text-lg' style={{ color: gmColor }}>Pathology Grandmasters</span>
          <span className='text-xs'>Grandmasters have solved at minimum 7 Grandmaster (or harder) levels</span>
          <UserAndSumTable data={gmLeaderboard} sumName='GMs Solved' />
        </div>
      );
    } else {
      return null;
    }
  }

  return (
    <Page title='Leaderboards'>
      <div className='p-6 flex flex-col items-center gap-6'>
        <h2 className='text-3xl font-bold text-center'>Leaderboards</h2>
        <Menu as='div' className='relative inline-block text-left w-fit'>
          <Menu.Button
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
          </Menu.Button>
          <Transition
            as={Fragment}
            enter='transition ease-out duration-100'
            enterFrom='transform opacity-0 scale-95'
            enterTo='transform opacity-100 scale-100'
            leave='transition ease-in duration-75'
            leaveFrom='transform opacity-100 scale-100'
            leaveTo='transform opacity-0 scale-95'
          >
            <Menu.Items className='absolute right-0 z-10 mt-1 rounded-md overflow-hidden border bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none' style={{
              borderColor: 'var(--bg-color)',
            }}>
              <div>
                {Object.keys(leaderboardStrings).map(leaderboardKey => {
                  return (
                    <Menu.Item key={`leaderboard-${leaderboardKey}`}>
                      {({ active }) => (
                        <button
                          className='text-black block p-1 text-xl font-medium w-64 flex items-center gap-1 justify-center'
                          onClick={() => setLeaderboard(leaderboardKey)}
                          role='menuitem'
                          style= {{
                            backgroundColor: active ? 'rgb(200, 200, 200)' : '',
                          }}
                        >
                          {leaderboardStrings[leaderboardKey]}
                        </button>
                      )}
                    </Menu.Item>
                  );
                })}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
        {getLeaderboard()}
      </div>
    </Page>
  );
}
