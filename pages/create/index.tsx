import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React from 'react';
import CreateHome from '../../components/createHome';
import Page from '../../components/page';
import { getUserFromToken } from '../../lib/withAuth';
import Level from '../../models/db/level';
import { LevelModel } from '../../models/mongoose';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  const levels = await LevelModel.find<Level>({
    isDeleted: { $ne: true },
    isDraft: true,
    userId: reqUser._id,
  }).sort({ name: 1 });

  return {
    props: {
      levels: JSON.parse(JSON.stringify(levels)),
    },
  };
}

export interface CreatePageProps {
  levels: Level[];
}

/* istanbul ignore next */
export default function Create({ levels }: CreatePageProps) {
  return (
    <Page title={'Create'}>
      <CreateHome levels={levels} />
    </Page>
  );
}
