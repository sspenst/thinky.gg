import { DIFFICULTY_NAMES, getDifficultyRangeFromDifficultyName } from '@root/components/difficultyDisplay';
import FormattedUser from '@root/components/formattedUser';
import Page from '@root/components/page';
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

async function getGMLeaderboard() {
  const GMThresh = getDifficultyRangeFromDifficultyName(DIFFICULTY_NAMES.GRANDMASTER);

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
  const gmLeaderboard = await getGMLeaderboard();

  return {
    props: {
      gmLeaderboard: JSON.parse(JSON.stringify(gmLeaderboard)),
    },
  };
}

export default function Leaderboard( { gmLeaderboard }: {gmLeaderboard: UserAndSum[]}) {
  const { user: reqUser } = useContext(AppContext);

  if (!gmLeaderboard) {
    return <span>Loading...</span>;
  }

  return (
    <>
      <Page title='Leaderboard'>
        <div className='p-3'>
          <h2 className='text-xl font-bold'>Grandmaster Leaderboard</h2>
          <p>Below is a list of Pathology Grandmasters. To become a grandmaster, a player must have completed at minimum 7 grandmaster (or super grandmaster) levels</p>
          <DataTable
            columns={[
              {
                name: '#',
                cell: (row: UserAndSum, index: number) => index + 1,

                width: '50px',

              },
              {
                name: 'User',
                cell: (row: UserAndSum) => <FormattedUser size={Dimensions.AvatarSizeSmall} user={row.user} />,
                minWidth: '200px',
              },
              {
                name: 'GMs Completed',
                selector: (row) => row.sum,
              },
            ]}
            conditionalRowStyles={[{
              when: row => row?.user._id === reqUser?._id,
              style: {
                backgroundColor: 'var(--bg-color-4)',
              },
            }]}
            customStyles={DATA_TABLE_CUSTOM_STYLES}
            data={gmLeaderboard}
            dense
            noDataComponent={
              <div className='p-3'>
          Nothing to display...
              </div>
            }
            striped
          />
        </div>
      </Page>
    </>
  );
}
