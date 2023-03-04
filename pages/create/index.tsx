import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React from 'react';
import LevelTable from '../../components/levelTable';
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

interface CreateProps {
  levels: Level[];
}

/* istanbul ignore next */
export default function Create({ levels }: CreateProps) {
  return (
    <Page title={'Create'}>
      <div className='flex flex-col gap-5 m-5'>
        <div className='text-center'>
          Welcome to the Create page! Here you can create levels. After creating a level, click on its name to start editing. Once you have finished designing your level, click the &apos;Test&apos; button to set the level&apos;s least moves, then click publish to make your level available for everyone to play. You can unpublish or delete a level at any time.
        </div>
        {!levels ?
          <div className='flex justify-center'>Loading levels...</div> :
          <LevelTable levels={levels} />
        }
      </div>
    </Page>
  );
}
