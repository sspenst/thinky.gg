/* istanbul ignore file */

import { Types } from 'mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import React from 'react';
import Game from '../../components/level/game';
import LinkInfo from '../../components/linkInfo';
import Page from '../../components/page';
import cleanUser from '../../lib/cleanUser';
import { getUserFromToken } from '../../lib/withAuth';
import Level from '../../models/db/level';
import { LevelModel } from '../../models/mongoose';
import { USER_DEFAULT_PROJECTION } from '../../models/schemas/userSchema';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
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
      },
    },
    {
      $lookup: {
        from: 'users',
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
        new LinkInfo('Create', '/create'),
        new LinkInfo(level.name, `/edit/${level._id}`),
      ]}
      isFullScreen={true}
      title='Test'
    >
      <Game
        allowFreeUndo={true}
        disablePlayAttempts={true}
        hideSidebar={true}
        level={level}
        onStatsSuccess={() => router.replace(router.asPath)}
      />
    </Page>
  );
}
