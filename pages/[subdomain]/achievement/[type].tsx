import FormattedAchievement from '@root/components/formatted/formattedAchievement';
import FormattedDate from '@root/components/formatted/formattedDate';
import FormattedUser from '@root/components/formatted/formattedUser';
import { dropConfetti } from '@root/components/page/Confetti';
import Page from '@root/components/page/page';
import DataTable from '@root/components/tables/dataTable';
import AchievementType from '@root/constants/achievements/achievementType';
import Dimensions from '@root/constants/dimensions';
import { AppContext } from '@root/contexts/appContext';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import cleanUser from '@root/lib/cleanUser';
import dbConnect from '@root/lib/dbConnect';
import { getUserFromToken } from '@root/lib/withAuth';
import Achievement from '@root/models/db/achievement';
import User from '@root/models/db/user';
import { AchievementModel, UserModel } from '@root/models/mongoose';
import { USER_DEFAULT_PROJECTION } from '@root/models/schemas/userSchema';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React, { useContext } from 'react';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    return {
      notFound: true,
    };
  }

  const { type } = context.query;
  const gameId = getGameIdFromReq(context.req);
  const [myAchievement, achievements] = await Promise.all([
    AchievementModel.findOne({ userId: reqUser._id, type: type as string, gameId: gameId, }),
    AchievementModel.aggregate([
      { $match: { type: type as string, gameId: gameId, } },
      { $sort: { createdAt: -1 } },
      { $limit: 1000 },
      {
        $lookup: {
          from: UserModel.collection.name,
          localField: 'userId',
          foreignField: '_id',
          as: 'userId',
          pipeline: [
            { $project: USER_DEFAULT_PROJECTION },
          ],
        },
      },
      { $unwind: { path: '$userId' } },
    ]),
  ]);

  for (const achievement of achievements) {
    cleanUser(achievement.userId);
  }

  return {
    props: {
      type: type as string,
      myAchievement: JSON.parse(JSON.stringify(myAchievement)),
      achievements: JSON.parse(JSON.stringify(achievements)),
    },
  };
}

/* istanbul ignore next */
export default function AchievementPage({ type, myAchievement, achievements }: {type: AchievementType, myAchievement?: Achievement, achievements: Achievement[] }) {
  const [page, setPage] = React.useState(1);
  const currData = achievements.slice((page - 1) * 25, page * 25);
  const { game } = useContext(AppContext);

  return (
    <Page title='Viewing Achievement'>
      <div className='flex flex-col items-center justify-center w-full p-3'>
        <FormattedAchievement achievementType={type} game={game} createdAt={myAchievement?.createdAt} unlocked={true} />
        <DataTable
          onSort={() => {}}
          sortBy='createdAt'
          sortDir='desc'
          onChangePage={(page: number) => {
            setPage(page);
          }}
          page={page}
          totalItems={achievements.length}
          columns={[
            {
              id: 'user',
              name: 'User',
              selector: (row: Achievement) => <FormattedUser id='following' size={Dimensions.AvatarSizeSmall} user={row.userId as User} />,
              sortable: false,
            },
            {
              id: 'when-follow',
              name: 'Date Earned',
              selector: (row: Achievement) => <FormattedDate date={row.createdAt} />,
              sortable: false,
            },
          ]}
          itemsPerPage={25}
          data={currData}
          noDataComponent={<div className='text-gray-500 dark:text-gray-400'>No users to show</div>}
        />
      </div>
    </Page>
  );
}
