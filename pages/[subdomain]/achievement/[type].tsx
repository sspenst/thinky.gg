import FormattedAchievement from '@root/components/formatted/formattedAchievement';
import FormattedDate from '@root/components/formatted/formattedDate';
import FormattedUser from '@root/components/formatted/formattedUser';
import Page from '@root/components/page/page';
import { DataTableOffline } from '@root/components/tables/dataTable';
import AchievementType from '@root/constants/achievements/achievementType';
import Dimensions from '@root/constants/dimensions';
import { AppContext } from '@root/contexts/appContext';
import { getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import cleanUser from '@root/lib/cleanUser';
import dbConnect from '@root/lib/dbConnect';
import { getUserFromToken } from '@root/lib/withAuth';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import Achievement from '@root/models/db/achievement';
import User from '@root/models/db/user';
import { AchievementModel, UserModel } from '@root/models/mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useContext } from 'react';

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
      ...getEnrichUserConfigPipelineStage(gameId, { excludeCalcs: true, localField: 'userId._id', lookupAs: 'userId.config' }),
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
  const { game } = useContext(AppContext);

  return (
    <Page title='Viewing Achievement'>
      <div className='flex flex-col items-center justify-center w-full p-3'>
        <FormattedAchievement achievementType={type} game={game} createdAt={myAchievement?.createdAt} unlocked={true} />
        <DataTableOffline
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
          data={achievements}
          itemsPerPage={25}
          noDataComponent={<div className='text-gray-500 dark:text-gray-400'>No users to show</div>}
        />
      </div>
    </Page>
  );
}
