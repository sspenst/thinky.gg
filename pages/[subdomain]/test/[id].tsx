/* istanbul ignore file */

import { getGameFromId, getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { Types } from 'mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { redirect } from 'next/dist/server/api-utils';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import LinkInfo from '../../../components/formatted/linkInfo';
import Game from '../../../components/level/game';
import Page from '../../../components/page/page';
import cleanUser from '../../../lib/cleanUser';
import { getUserFromToken } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import { LevelModel, UserModel } from '../../../models/mongoose';
import { USER_DEFAULT_PROJECTION } from '../../../models/schemas/userSchema';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const gameId = getGameIdFromReq(context.req);
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const { id } = context.query;

  if (!reqUser || typeof id !== 'string') {
    return {
      redirect: {
        destination: '/login' + (context.resolvedUrl ? '?redirect=' + encodeURIComponent(context.resolvedUrl) : ''),
        permanent: false,
      },
    };
  }

  // LevelModel aggregate the level with the user's data.
  const levelAgg = await LevelModel.aggregate([
    {
      $match: {
        _id: new Types.ObjectId(id),
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
  ]);

  if (!levelAgg || levelAgg.length !== 1) {
    return {
      notFound: true,
    };
  }

  const level = levelAgg[0];

  const game = getGameFromId(level.gameId);
  let validateResult = undefined;

  if (game.validateLevelPlayableFunction) {
    validateResult = game.validateLevelPlayableFunction(level.data);
  }

  cleanUser(level.userId);

  return {
    props: {
      level: JSON.parse(JSON.stringify(level)),
      validateResult,
    } as TestProps,
  };
}

interface TestProps {
  level: Level;
  validateResult?: { valid: boolean; reasons: string[] };
}

export default function Test({ level, validateResult }: TestProps) {
  const router = useRouter();

  useEffect(() => {
    if (validateResult?.valid === false) {
      toast.error(validateResult.reasons.join('\n'));
      router.replace('/edit/' + level._id);
    }
  }, [level._id, router, validateResult]);

  return (
    <Page
      folders={[
        new LinkInfo('Drafts', '/drafts'),
        new LinkInfo(level.name, `/edit/${level._id}`),
      ]}
      isFullScreen={true}
      title='Test'
    >
      <div className='flex flex-col h-full max-w-full'>
        <h2 className='whitespace-nowrap font-bold truncate text-center p-1'>
          {level.name}
        </h2>
        <Game
          allowFreeUndo={true}
          disablePlayAttempts={true}
          level={level}
          onStatsSuccess={() => router.replace(router.asPath)}
        />
      </div>
    </Page>
  );
}
