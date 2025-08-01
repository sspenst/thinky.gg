import FormattedDifficulty, { difficultyList, getDifficultyColor } from '@root/components/formatted/formattedDifficulty';
import Page from '@root/components/page/page';
import { ProfileQueryType } from '@root/constants/profileQueryType';
import TimeRange from '@root/constants/timeRange';
import { getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import { getGameFromId, getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { redirectToLogin } from '@root/helpers/redirectToLogin';
import cleanUser from '@root/lib/cleanUser';
import { getUserFromToken } from '@root/lib/withAuth';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import { UserModel } from '@root/models/mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import { JSX } from 'react';
import { getProfileQuery } from '../../api/user/[id]';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const gameId = getGameIdFromReq(context.req);
  const game = getGameFromId(gameId);

  if (game.disableRanked) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  if (!reqUser) {
    return redirectToLogin(context);
  }

  const [profileQuery, users] = await Promise.all([
    getProfileQuery(gameId,
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
        },
      },
      ...getEnrichUserConfigPipelineStage(gameId),
      {
        $sort: {
          // config.calcRankedSolves: -1,
          'config.calcRankedSolves': -1,
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
    },
  };
}

interface RankedPageProps {
  levelsByDifficulty: { [key: string]: number };
  rankedSolvesByDifficulty: { [key: string]: number };
}

/* istanbul ignore next */
export default function RankedPage({ levelsByDifficulty, rankedSolvesByDifficulty }: RankedPageProps): JSX.Element {
  return (
    <Page title='Ranked'>
      <div className='py-6 px-3 flex flex-col gap-6 items-center'>
        <h2 className='font-bold text-3xl'>Ranked 🏅</h2>
        <p className='text-center max-w-xl'>Ranked levels are high quality puzzles hand-picked by the Pathology community. Solving ranked levels is the best way to compete against other Pathology players and improve your spot on the <Link href='/leaderboards' className='font-bold text-blue-500 hover:text-blue-400 transition'>leaderboards</Link>! New levels are periodically marked as ranked, so there is always a chance <Link href='/drafts' className='font-bold text-blue-500 hover:text-blue-400 transition'>your levels</Link> could enter this curated list. Have fun!</p>
        <Link
          className='font-bold text-2xl hover-bg-3 transition px-3 py-1 rounded-lg w-fit'
          href={{
            pathname: '/search',
            query: {
              isRanked: true,
              timeRange: TimeRange[TimeRange.All],
            },
          }}
        >
          <div className='flex flex-wrap gap-2 justify-center'>
            <span>Your Solves</span>
            <span>({Object.values(rankedSolvesByDifficulty).reduce((a, b) => a + b, 0)} / {Object.values(levelsByDifficulty).reduce((a, b) => a + b, 0)})</span>
          </div>
        </Link>
        <div className='flex flex-col max-w-full'>
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
                  className='flex items-center text-xl font-medium gap-3 hover-bg-3 transition px-4 py-2 rounded-lg w-fit max-w-full'
                  href={{
                    pathname: '/search',
                    query: {
                      difficultyFilter: difficulty.name,
                      isRanked: true,
                      timeRange: TimeRange[TimeRange.All],
                    },
                  }}
                  key={`${difficulty.name}-levels-solved`}
                >
                  <FormattedDifficulty difficulty={difficulty} id='ranked' />
                  <span className='gray whitespace-nowrap' style={{
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
