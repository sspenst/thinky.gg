import FormattedDifficulty, { difficultyList, getDifficultyColor } from '@root/components/formatted/formattedDifficulty';
import Page from '@root/components/page/page';
import SpaceBackground from '@root/components/page/SpaceBackground';
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
  const totalSolved = Object.values(rankedSolvesByDifficulty).reduce((a, b) => a + b, 0);
  const totalLevels = Object.values(levelsByDifficulty).reduce((a, b) => a + b, 0);
  const completionPercentage = totalLevels > 0 ? Math.round((totalSolved / totalLevels) * 100) : 0;
  
  // Calculate the highest difficulty achieved
  let highestDifficultyAchieved = null;
  for (let i = difficultyList.length - 1; i >= 0; i--) {
    const difficulty = difficultyList[i];
    const solved = difficulty.value in rankedSolvesByDifficulty ? rankedSolvesByDifficulty[difficulty.value] : 0;
    const total = difficulty.value in levelsByDifficulty ? levelsByDifficulty[difficulty.value] : 0;
    
    if (solved > 0 && total > 0 && difficulty.name !== 'Pending') {
      highestDifficultyAchieved = difficulty;
      break;
    }
  }

  return (
    <Page title='Ranked'>
      <SpaceBackground 
        starCount={80}
        constellationPattern='leaderboard'
        showGeometricShapes={true}
      >
        <div className='flex flex-col items-center justify-center min-h-screen px-4 py-8'>
          {/* Trophy Icon */}
          <div className='mb-8 animate-fadeInDown' style={{ animationDelay: '0.3s' }}>
            <div className='text-6xl sm:text-8xl animate-bounce' style={{ animationDuration: '3s' }}>
              🏆
            </div>
          </div>
          
          {/* Title */}
          <h1 className='text-4xl sm:text-6xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 mb-6 text-center leading-tight px-2 animate-fadeInScale' style={{ animationDelay: '0.5s' }}>
            Ranked Arena
          </h1>
          
          {/* Description */}
          <div className='max-w-2xl mx-auto text-center mb-8 sm:mb-12 animate-fadeInUp' style={{ animationDelay: '0.7s' }}>
            <p className='text-gray-300 text-lg sm:text-xl mb-4'>
              Elite puzzles handpicked by the community. Master these challenges to climb the 
              <Link href='/leaderboards' className='font-bold text-yellow-400 hover:text-yellow-300 transition mx-1'>leaderboards</Link> 
              and prove your skills against the best players!
            </p>
            <p className='text-gray-400 text-sm sm:text-base'>
              Create amazing levels? Your puzzles could be selected for this prestigious collection!
            </p>
          </div>
          
          {/* Progress Ring */}
          <div className='relative mb-8 sm:mb-12 animate-fadeInScale' style={{ animationDelay: '0.9s' }}>
            <svg className='w-48 h-48 sm:w-64 sm:h-64 transform -rotate-90' viewBox='0 0 256 256'>
              {/* Background ring */}
              <circle
                cx='128'
                cy='128'
                r='112'
                fill='none'
                stroke='rgba(255,255,255,0.1)'
                strokeWidth='8'
              />
              {/* Progress ring */}
              <circle
                cx='128'
                cy='128'
                r='112'
                fill='none'
                stroke='url(#rankedGradient)'
                strokeWidth='8'
                strokeLinecap='round'
                strokeDasharray={`${2 * Math.PI * 112}`}
                strokeDashoffset={`${2 * Math.PI * 112 * (1 - totalSolved / Math.max(totalLevels, 1))}`}
                className='transition-all duration-2000 ease-out'
              />
              <defs>
                <linearGradient id='rankedGradient' x1='0%' y1='0%' x2='100%' y2='100%'>
                  <stop offset='0%' stopColor='#fbbf24' />
                  <stop offset='50%' stopColor='#fb923c' />
                  <stop offset='100%' stopColor='#ef4444' />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Center content */}
            <div className='absolute inset-0 flex flex-col items-center justify-center'>
              <div className='text-3xl sm:text-5xl font-black text-white mb-2'>{completionPercentage}%</div>
              <div className='text-sm sm:text-lg text-gray-300 font-bold'>{totalSolved}/{totalLevels}</div>
              <div className='text-xs sm:text-sm text-gray-400'>MASTERED</div>
            </div>
          </div>
          
          {/* Current Rank Display */}
          {highestDifficultyAchieved && (
            <div className='mb-8 animate-fadeInUp' style={{ animationDelay: '1.1s' }}>
              <div className='bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-4 text-white text-center'>
                <div className='text-xs opacity-70 mb-2'>HIGHEST DIFFICULTY</div>
                <div className='flex items-center justify-center gap-3'>
                  <span className='text-2xl'>{highestDifficultyAchieved.emoji}</span>
                  <span className='text-xl font-black' style={{ color: getDifficultyColor(highestDifficultyAchieved.value) }}>
                    {highestDifficultyAchieved.name}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* View All Button */}
          <Link
            href={{
              pathname: '/search',
              query: {
                isRanked: true,
                timeRange: TimeRange[TimeRange.All],
              },
            }}
            className='group relative overflow-hidden bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-black py-4 sm:py-6 px-8 sm:px-12 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300 mb-12 animate-fadeInUp'
            style={{ animationDelay: '1.3s' }}
          >
            <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-700' />
            <div className='relative flex items-center gap-3 sm:gap-4 justify-center'>
              <div className='text-2xl sm:text-3xl'>📊</div>
              <div className='text-center'>
                <div className='text-xl sm:text-2xl'>VIEW ALL RANKED</div>
                <div className='text-xs sm:text-sm opacity-80'>Your Progress</div>
              </div>
            </div>
          </Link>
          
          {/* Difficulty Breakdown */}
          <div className='flex flex-col gap-3 max-w-2xl w-full animate-fadeInUp' style={{ animationDelay: '1.5s' }}>
            {difficultyList.map((difficulty, index) => {
              const levelsSolved = difficulty.value in rankedSolvesByDifficulty && rankedSolvesByDifficulty[difficulty.value] || 0;
              const levels = difficulty.value in levelsByDifficulty && levelsByDifficulty[difficulty.value] || 0;

              // don't show pending unless we have to
              if (difficulty.name === 'Pending' && levelsSolved === 0) {
                return null;
              }

              if (levels === 0) {
                return null;
              }

              const isCompleted = levelsSolved === levels;
              const progressPercent = levels > 0 ? (levelsSolved / levels) * 100 : 0;

              return (
                <Link
                  className='group relative overflow-hidden bg-black/20 backdrop-blur-sm border border-white/20 hover:border-white/30 rounded-xl p-4 sm:p-6 transition-all duration-300 hover:scale-[1.02]'
                  href={{
                    pathname: '/search',
                    query: {
                      difficultyFilter: difficulty.name,
                      isRanked: true,
                      timeRange: TimeRange[TimeRange.All],
                    },
                  }}
                  key={`${difficulty.name}-levels-solved`}
                  style={{ animationDelay: `${1.5 + index * 0.1}s` }}
                >
                  {/* Progress bar background */}
                  <div className='absolute inset-0 opacity-30'>
                    <div 
                      className='h-full transition-all duration-500'
                      style={{
                        width: `${progressPercent}%`,
                        background: `linear-gradient(to right, transparent, ${getDifficultyColor(difficulty.value)})`
                      }}
                    />
                  </div>
                  
                  <div className='relative flex items-center justify-between'>
                    <div className='flex items-center gap-4'>
                      <FormattedDifficulty difficulty={difficulty} id='ranked' />
                      <span className='text-xl font-bold text-white'>{difficulty.name}</span>
                    </div>
                    <div className='flex items-center gap-3'>
                      <span className='text-lg font-bold' style={{
                        color: isCompleted ? getDifficultyColor(difficulty.value) : 'white',
                      }}>
                        {levelsSolved} / {levels}
                      </span>
                      {isCompleted && <span className='text-2xl'>✅</span>}
                    </div>
                  </div>
                </Link>
              );
            }).reverse()}
          </div>
        </div>
      </SpaceBackground>
    </Page>
  );
}
