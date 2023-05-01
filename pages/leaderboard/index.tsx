import { DIFFICULTY_NAMES, getDifficultyColor, getDifficultyRangeFromDifficultyName, getFormattedDifficulty } from '@root/components/difficultyDisplay';
import FormattedUser from '@root/components/formattedUser';
import Page from '@root/components/page';
import UserAndValueRankTable from '@root/components/tables/UserAndValueRankTable';
import Dimensions from '@root/constants/dimensions';
import { AppContext } from '@root/contexts/appContext';
import { UserAndSum } from '@root/contexts/levelContext';
import { DATA_TABLE_CUSTOM_STYLES } from '@root/helpers/dataTableCustomStyles';
import cleanUser from '@root/lib/cleanUser';
import { LevelModel } from '@root/models/mongoose';
import { USER_DEFAULT_PROJECTION } from '@root/models/schemas/userSchema';
import { GetServerSidePropsContext } from 'next';
import React, { useContext } from 'react';
import DataTable from 'react-data-table-component';

async function getGMLeaderboard(range: DIFFICULTY_NAMES) {
  const GMThresh = getDifficultyRangeFromDifficultyName(range);

  const agg = await LevelModel.aggregate([
    {
      $match: {
        isDraft: false,
        isDeleted: {
          $ne: true,
        },
        calc_difficulty_estimate: {
          $gte: GMThresh[0],
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
        count: -1
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
        sum: -1
      }
    },

    {
      $limit: 100
    },
  ]);

  // clean each one
  for (const user of agg) {
    cleanUser(user);
  }

  return agg;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const [gmLeaderboard, sgmLeaderboard] = await Promise.all([getGMLeaderboard(DIFFICULTY_NAMES.GRANDMASTER), getGMLeaderboard(DIFFICULTY_NAMES.SUPER_GRANDMASTER)]);

  return {
    props: {
      gmLeaderboard: JSON.parse(JSON.stringify(gmLeaderboard)),
      sgmLeaderboard: JSON.parse(JSON.stringify(sgmLeaderboard)),
    },
  };
}

export default function Leaderboard( { gmLeaderboard, sgmLeaderboard }: { gmLeaderboard: UserAndSum[], sgmLeaderboard: UserAndSum[] }) {
  const { user: reqUser } = useContext(AppContext);

  if (!gmLeaderboard) {
    return <span>Loading...</span>;
  }

  const GMThresh = getDifficultyRangeFromDifficultyName(DIFFICULTY_NAMES.GRANDMASTER);
  const SGMThresh = getDifficultyRangeFromDifficultyName(DIFFICULTY_NAMES.SUPER_GRANDMASTER);

  const colorGM = getDifficultyColor(GMThresh[0]);
  const colorSGM = getDifficultyColor(SGMThresh[0]);

  return (
    <>
      <Page title='Leaderboard'>
        <div className='p-3 flex flex-col'>
          <h2 className='text-xl font-bold text-center p-3'>Grandmaster Leaderboards</h2>
          <div className='flex flex-col md:flex-row gap-5 justify-center'>

            <div className='flex flex-col'>
              <span className='font-bold italic' style={
                {
                  color: colorGM
                }
              }>Pathology Grandmasters</span><span className='text-xs'>Grandmasters have completed at minimum 7 Grandmaster (or harder) levels</span>
              <UserAndValueRankTable data={gmLeaderboard} reqUser={reqUser} valueHeader='GMs Completed' />
            </div>
            <div className='flex flex-col'>
              <span className='font-bold italic' style={
                {
                  color: colorSGM
                }
              }>Pathology Super Grandmasters</span><span className='text-xs'>Super Grandmasters have completed at minimum 7 Super Grandmaster levels</span>
              <UserAndValueRankTable data={sgmLeaderboard} reqUser={reqUser} valueHeader='SGMs Completed' />
            </div>
          </div>

        </div>
      </Page>
    </>
  );
}
