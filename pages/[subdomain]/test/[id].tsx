/* istanbul ignore file */

import GameRefactored from '@root/components/level/game-refactored';
import { getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import { getGameFromId, getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { redirectToLogin } from '@root/helpers/redirectToLogin';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import { Types } from 'mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import LinkInfo from '../../../components/formatted/linkInfo';
import Page from '../../../components/page/page';
import cleanUser from '../../../lib/cleanUser';
import { getUserFromToken } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import { LevelModel, UserModel } from '../../../models/mongoose';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const gameId = getGameIdFromReq(context.req);
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const { id } = context.query;

  if (!reqUser || typeof id !== 'string') {
    return redirectToLogin(context);
  }

  // LevelModel aggregate the level with the user's data.
  const levelAgg = await LevelModel.aggregate([
    {
      $match: {
        _id: new Types.ObjectId(id),
        isDeleted: { $ne: true },
        isDraft: true,
        userId: reqUser._id,
        gameId: gameId
      },
    },
    {
      $lookup: {
        from: UserModel.collection.name,
        localField: 'userId',
        foreignField: '_id',
        as: 'userId',
        pipeline: [
          {
            $project: {
              ...USER_DEFAULT_PROJECTION,
            }
          }
        ]
      },
    },
    {
      $unwind: {
        path: '$userId',
        preserveNullAndEmptyArrays: true,
      },
    },
    ...getEnrichUserConfigPipelineStage(gameId, { excludeCalcs: true, localField: 'userId._id', lookupAs: 'userId.config' }),
  ]);

  if (!levelAgg || levelAgg.length !== 1) {
    return {
      notFound: true,
    };
  }

  const level = levelAgg[0];
  const game = getGameFromId(level.gameId);
  let validateResult = undefined;

  if (game.validateLevel) {
    validateResult = game.validateLevel(level.data);

    if (!validateResult.valid) {
      return {
        redirect: {
          destination: '/edit/' + level._id,
          permanent: false,
        },
      };
    }
  }

  cleanUser(level.userId);

  return {
    props: {
      level: JSON.parse(JSON.stringify(level)),
    } as TestProps,
  };
}

interface TestProps {
  level: Level;
}

export default function Test({ level }: TestProps) {
  const router = useRouter();

  return (
    <Page
      folders={[
        new LinkInfo('Drafts', '/drafts'),
        new LinkInfo(level?.name, `/edit/${level._id}`),
      ]}
      isFullScreen={true}
      title='Test'
    >
      <div className='flex flex-col h-full max-w-full'>
        <h2 className='whitespace-nowrap font-bold truncate text-center p-1'>
          {level?.name}
        </h2>
        <GameRefactored
          disablePlayAttempts={true}
          level={level}
          onStatsSuccess={() => router.replace(router.asPath)}
        />
      </div>
    </Page>
  );
}
