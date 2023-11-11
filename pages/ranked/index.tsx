import Page from '@root/components/page/page';
import LevelsSolvedByDifficultyList from '@root/components/profile/levelsSolvedByDifficultyList';
import { ProfileQueryType } from '@root/constants/profileQueryType';
import { getUserFromToken } from '@root/lib/withAuth';
import User from '@root/models/db/user';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React from 'react';
import { getProfileQuery } from '../api/user/[id]';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    return {
      redirect: {
        destination: '/login' + (context.resolvedUrl ? '?redirect=' + encodeURIComponent(context.resolvedUrl) : ''),
        permanent: false,
      },
    };
  }

  const rankedSolvesByDifficulty = (await getProfileQuery(reqUser._id.toString(), [ProfileQueryType.RankedSolvesByDifficulty]))[ProfileQueryType.RankedSolvesByDifficulty];

  return {
    props: {
      rankedSolvesByDifficulty: JSON.parse(JSON.stringify(rankedSolvesByDifficulty)),
      reqUser: JSON.parse(JSON.stringify(reqUser)),
    },
  };
}

interface RankedPageProps {
  rankedSolvesByDifficulty: { [key: string]: number };
  reqUser: User;
}

export default function RankedPage({ rankedSolvesByDifficulty, reqUser }: RankedPageProps): JSX.Element {
  return (
    <Page title='Ranked'>
      <div className='p-3 flex flex-col items-center'>
        <h2 className='font-bold text-3xl'>Ranked</h2>
        {/* TODO: group levels by difficulty, can click into each difficulty category */}
        <LevelsSolvedByDifficultyList data={rankedSolvesByDifficulty} />
      </div>
    </Page>
  );
}
