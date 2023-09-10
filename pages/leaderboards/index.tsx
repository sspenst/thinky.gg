import { DIFFICULTY_INDEX, getDifficultyColor, getDifficultyRangeByIndex } from '@root/components/formatted/formattedDifficulty';
import Page from '@root/components/page/page';
import UserAndSumTable from '@root/components/tables/userAndSumTable';
import { UserAndSum } from '@root/contexts/levelContext';
import cleanUser from '@root/lib/cleanUser';
import { LevelModel } from '@root/models/mongoose';
import { USER_DEFAULT_PROJECTION } from '@root/models/schemas/userSchema';
import React from 'react';

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
    // now get players that have beaten these levels by checking stats where completed is true
    // and then group by user and count the number of levels they've beaten
    {
      $lookup: {
        from: 'stats',
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
    // now each element has a users array with the userIds of the users that have completed the level. We want to unwind this array and then group by userId and count the number of times they appear
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
        from: 'users',
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

export async function getServerSideProps() {
  const [gmLeaderboard, sgmLeaderboard] = await Promise.all([
    getDifficultyLeaderboard(DIFFICULTY_INDEX.GRANDMASTER),
    getDifficultyLeaderboard(DIFFICULTY_INDEX.SUPER_GRANDMASTER),
  ]);

  return {
    props: {
      gmLeaderboard: JSON.parse(JSON.stringify(gmLeaderboard)),
      sgmLeaderboard: JSON.parse(JSON.stringify(sgmLeaderboard)),
    },
  };
}

interface LeaderboardsProps {
  gmLeaderboard: UserAndSum[];
  sgmLeaderboard: UserAndSum[];
}

export default function Leaderboards({ gmLeaderboard, sgmLeaderboard }: LeaderboardsProps) {
  const gmRange = getDifficultyRangeByIndex(DIFFICULTY_INDEX.GRANDMASTER);
  const sgmRange = getDifficultyRangeByIndex(DIFFICULTY_INDEX.SUPER_GRANDMASTER);
  const gmColor = getDifficultyColor(gmRange[0]);
  const sgmColor = getDifficultyColor(sgmRange[0]);

  return (
    <Page title='Leaderboards'>
      <div className='p-3 flex flex-col gap-3'>
        <h2 className='text-2xl font-bold text-center'>Leaderboards</h2>
        <div className='flex flex-col md:flex-row gap-5 justify-center'>
          <div className='flex flex-col text-center gap-1'>
            <span className='font-bold italic text-lg' style={{ color: gmColor }}>Pathology Grandmasters</span>
            <span className='text-xs'>Grandmasters have completed at minimum 7 Grandmaster (or harder) levels</span>
            <UserAndSumTable data={gmLeaderboard} sumName='GMs Completed' />
          </div>
          <div className='flex flex-col text-center gap-1'>
            <span className='font-bold italic text-lg' style={{ color: sgmColor }}>Pathology Super Grandmasters</span>
            <span className='text-xs'>Super Grandmasters have completed at minimum 7 Super Grandmaster levels</span>
            <UserAndSumTable data={sgmLeaderboard} sumName='SGMs Completed' />
          </div>
        </div>
      </div>
    </Page>
  );
}
