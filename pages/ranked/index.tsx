import FormattedDifficulty, { difficultyList, getDifficultyColor } from '@root/components/formatted/formattedDifficulty';
import Page from '@root/components/page/page';
import LevelsSolvedByDifficultyList from '@root/components/profile/levelsSolvedByDifficultyList';
import { ProfileQueryType } from '@root/constants/profileQueryType';
import { getUserFromToken } from '@root/lib/withAuth';
import User from '@root/models/db/user';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
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

  const profileQuery = await getProfileQuery(
    reqUser._id.toString(),
    [
      ProfileQueryType.LevelsByDifficulty,
      ProfileQueryType.RankedSolvesByDifficulty,
    ],
  );

  const levelsByDifficulty = profileQuery[ProfileQueryType.LevelsByDifficulty];
  const rankedSolvesByDifficulty = profileQuery[ProfileQueryType.RankedSolvesByDifficulty];

  return {
    props: {
      levelsByDifficulty: JSON.parse(JSON.stringify(levelsByDifficulty)),
      rankedSolvesByDifficulty: JSON.parse(JSON.stringify(rankedSolvesByDifficulty)),
      reqUser: JSON.parse(JSON.stringify(reqUser)),
    },
  };
}

interface RankedPageProps {
  levelsByDifficulty: { [key: string]: number };
  rankedSolvesByDifficulty: { [key: string]: number };
  reqUser: User;
}

export default function RankedPage({ levelsByDifficulty, rankedSolvesByDifficulty, reqUser }: RankedPageProps): JSX.Element {
  return (
    <Page title='Ranked'>
      <div className='p-3 flex flex-col gap-4 items-center'>
        <h2 className='font-bold text-3xl'>Ranked</h2>
        {/* TODO: group levels by difficulty, can click into each difficulty category */}
        <div className='flex flex-col'>
          {
            difficultyList.map(difficulty => {
              const levelsSolved = difficulty.value in rankedSolvesByDifficulty && rankedSolvesByDifficulty[difficulty.value] || 0;
              const levels = difficulty.value in levelsByDifficulty && levelsByDifficulty[difficulty.value] || 0;

              // don't show pending unless we have to
              if (difficulty.name === 'Pending' && levelsSolved === 0) {
                return null;
              }

              return (
                <Link
                  className='flex items-center text-xl font-medium gap-3 hover-bg-3 transition px-4 py-2 rounded-lg w-fit'
                  href={{
                    pathname: '/search',
                    query: {
                      difficultyFilter: difficulty.name,
                      isRanked: true,
                    },
                  }}
                  key={`${difficulty.name}-levels-solved`}
                >
                  <FormattedDifficulty difficultyEstimate={difficulty.value} id={difficulty.name} />
                  <span className='gray' style={{
                    color: levelsSolved === levels ? getDifficultyColor(difficulty.value) : undefined,
                  }}>{levelsSolved} / {levels}</span>
                </Link>
              );
            }).reverse()
          }
        </div>
      </div>
    </Page>
  );
}
