import FormattedDifficulty, { difficultyList, getDifficultyColor } from '@root/components/formatted/formattedDifficulty';
import FormattedUser from '@root/components/formatted/formattedUser';
import Page from '@root/components/page/page';
import { ProfileQueryType } from '@root/constants/profileQueryType';
import cleanUser from '@root/lib/cleanUser';
import { getUserFromToken } from '@root/lib/withAuth';
import User from '@root/models/db/user';
import { UserModel } from '@root/models/mongoose';
import { USER_DEFAULT_PROJECTION } from '@root/models/schemas/userSchema';
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

  const [profileQuery, users] = await Promise.all([
    getProfileQuery(
      reqUser._id.toString(),
      [
        ProfileQueryType.LevelsByDifficulty,
        ProfileQueryType.RankedSolvesByDifficulty,
      ],
    ),
    UserModel.aggregate([
      {
        $project: {
          ...USER_DEFAULT_PROJECTION,
          calcRankedSolves: 1,
        },
      },
      {
        $sort: {
          calcRankedSolves: -1,
        },
      },
      {
        $limit: 15,
      },
    ])
  ]);

  users.forEach(user => {
    cleanUser(user);
  });

  const levelsByDifficulty = profileQuery[ProfileQueryType.LevelsByDifficulty];
  const rankedSolvesByDifficulty = profileQuery[ProfileQueryType.RankedSolvesByDifficulty];

  return {
    props: {
      levelsByDifficulty: JSON.parse(JSON.stringify(levelsByDifficulty)),
      rankedSolvesByDifficulty: JSON.parse(JSON.stringify(rankedSolvesByDifficulty)),
      reqUser: JSON.parse(JSON.stringify(reqUser)),
      users: JSON.parse(JSON.stringify(users)),
    },
  };
}

interface RankedPageProps {
  levelsByDifficulty: { [key: string]: number };
  rankedSolvesByDifficulty: { [key: string]: number };
  reqUser: User;
  users: User[];
}

export default function RankedPage({ levelsByDifficulty, rankedSolvesByDifficulty, reqUser, users }: RankedPageProps): JSX.Element {
  return (
    <Page title='Ranked'>
      <div className='p-3 flex flex-col gap-6 items-center'>
        <h2 className='font-bold text-3xl'>Ranked 🏅</h2>
        <p className='text-center max-w-xl'>Ranked levels are high quality puzzles curated by the Pathology community. Solving ranked levels is the best way to compete against other Pathology players and improve your spot on the <Link href='/leaderboards' className='font-bold text-blue-500 hover:text-blue-400 transition'>leaderboards</Link>! New levels are periodically marked as ranked, so there is always a chance <Link href='/create' className='font-bold text-blue-500 hover:text-blue-400 transition'>your levels</Link> could enter this curated list. Have fun!</p>
        <div className='flex gap-12 flex-wrap justify-center'>
          <div className='flex flex-col gap-4 items-center'>
            <Link
              className='font-bold text-2xl hover:underline rounded-lg'
              href={{
                pathname: '/search',
                query: {
                  isRanked: true,
                },
              }}
            >
              Your Solves ({Object.values(rankedSolvesByDifficulty).reduce((a, b) => a + b, 0)} / {Object.values(levelsByDifficulty).reduce((a, b) => a + b, 0)})
            </Link>
            <div className='flex flex-col'>
              {
                difficultyList.map(difficulty => {
                  const levelsSolved = difficulty.value in rankedSolvesByDifficulty && rankedSolvesByDifficulty[difficulty.value] || 0;
                  const levels = difficulty.value in levelsByDifficulty && levelsByDifficulty[difficulty.value] || 0;

                  // don't show pending unless we have to
                  if (difficulty.name === 'Pending' && levelsSolved === 0) {
                    return null;
                  }

                  if (levels === 0) {
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
          <div className='flex flex-col items-center gap-4'>
            <Link className='font-bold text-2xl hover:underline' href='/users'>Leaderboard</Link>

            <div className='grid gap-2 items-center' style={{
              gridTemplateColumns: 'repeat(3, min-content)',
            }}>
              {users.map((user, i) => {
                return (<>
                  <div className='font-bold text-xl'>{i + 1}.</div>
                  <div
                    className='flex items-center text-lg gap-3 rounded-lg w-fit'
                    key={`${user._id}-levels-solved`}
                  >
                    <FormattedUser id='ranked' size={32} user={user} />
                  </div>
                  <div className='ml-2 font-medium text-lg'>
                    {user.calcRankedSolves}
                  </div>
                </>);
              })}
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
