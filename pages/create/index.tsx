import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React from 'react';
import CreateHome from '../../components/editor/createHome';
import Page from '../../components/page/page';
import { getUserFromToken } from '../../lib/withAuth';
import Level from '../../models/db/level';
import User from '../../models/db/user';
import { LevelModel } from '../../models/mongoose';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const gameId = getGameIdFromReq(context.req);

  if (!reqUser) {
    return {
      redirect: {
        destination: '/login' + (context.resolvedUrl ? '?redirect=' + encodeURIComponent(context.resolvedUrl) : ''),
        permanent: false,
      },
    };
  }

  const levels = await LevelModel.find<Level>({
    isDeleted: { $ne: true },
    isDraft: true,
    userId: reqUser._id,
    gameId: gameId
  }).sort({ name: 1 });

  return {
    props: {
      levels: JSON.parse(JSON.stringify(levels)),
      user: JSON.parse(JSON.stringify(reqUser)),
    },
  };
}

export interface CreatePageProps {
  levels: Level[];
  user: User;
}

/* istanbul ignore next */
export default function Create({ levels, user }: CreatePageProps) {
  return (
    <Page title={'Create'}>
      <CreateHome levels={levels} user={user} />
    </Page>
  );
}
