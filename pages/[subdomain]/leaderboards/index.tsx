import { DIFFICULTY_INDEX, getDifficultyColor, getDifficultyRangeByIndex } from '@root/components/formatted/formattedDifficulty';
import FormattedUser from '@root/components/formatted/formattedUser';
import Page from '@root/components/page/page';
import SpaceBackground from '@root/components/page/SpaceBackground';
import { GameId } from '@root/constants/GameId';
import { GameType } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import { UserAndSum } from '@root/contexts/levelContext';
import { getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import { getGameFromId, getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import cleanUser from '@root/lib/cleanUser';
import { getUserFromToken } from '@root/lib/withAuth';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import User from '@root/models/db/user';
import { LevelModel, StatModel, UserModel } from '@root/models/mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import { useContext, useState } from 'react';

async function getDifficultyLeaderboard(gameId: GameId, index: DIFFICULTY_INDEX) {
  const difficultyRange = getDifficultyRangeByIndex(index);
  const game = getGameFromId(gameId);
  const difficultyEstimate = game.type === GameType.COMPLETE_AND_SHORTEST ? 'calc_difficulty_completion_estimate' : 'calc_difficulty_estimate';

  // Optimize the aggregation pipeline
  const agg = await LevelModel.aggregate([
    {
      $match: {
        isDraft: false,
        isDeleted: { $ne: true },
        gameId: gameId,
        [difficultyEstimate]: { $gte: difficultyRange[0] }
      }
    },
    {
      // Project only the _id field early to reduce data transfer
      $project: {
        _id: 1
      }
    },
    {
      // Use $lookup with a more efficient pipeline
      $lookup: {
        from: StatModel.collection.name,
        let: { levelId: '$_id' },
        pipeline: [{
          $match: {
            $expr: {
              $and: [
                { $eq: ['$levelId', '$$levelId'] },
                { $eq: ['$complete', true] }
              ]
            },
          }
        }, {
          $group: {
            _id: '$userId'
          }
        }],
        as: 'stat'
      }
    },
    {
      $unwind: '$stat'
    },
    {
      $group: {
        _id: '$stat._id',
        sum: { $sum: 1 }
      }
    },
    {
      $match: {
        sum: { $gte: 7 }
      }
    },
    {
      $sort: {
        sum: -1
      }
    },
    {
      // Limit early to reduce user lookups
      $limit: 100
    },
    {
      // Optimize user lookup by moving it after filtering
      $lookup: {
        from: UserModel.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          {
            $project: USER_DEFAULT_PROJECTION
          },
          ...getEnrichUserConfigPipelineStage(gameId, { excludeCalcs: true })
        ]
      }
    },
    {
      $unwind: '$user'
    },
    {
      $sort: {
        sum: -1,
        'user.name': 1
      }
    }
  ]) as UserAndSum[];

  // Clean users in batch instead of loop
  const users = agg.map(item => item.user);

  users.forEach(cleanUser);

  return agg;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const gameId = getGameIdFromReq(context.req);
  const game = getGameFromId(gameId);

  // Optimize by conditionally fetching data
  const reqUserPromise = token ? getUserFromToken(token, context.req as NextApiRequest) : Promise.resolve(null);

  const promises: Promise<UserAndSum[] | User[] | User | null>[] = [
    getDifficultyLeaderboard(gameId, DIFFICULTY_INDEX.GRANDMASTER),
    getDifficultyLeaderboard(gameId, DIFFICULTY_INDEX.SUPER_GRANDMASTER),
    reqUserPromise
  ];

  // Only fetch ranked leaderboard if needed
  if (!game.disableRanked) {
    promises.push(UserModel.aggregate<User>([
      {
        $project: USER_DEFAULT_PROJECTION
      },
      ...getEnrichUserConfigPipelineStage(gameId),
      {
        $match: {
          'config.calcRankedSolves': { $gt: 0 }
        }
      },
      {
        $sort: {
          'config.calcRankedSolves': -1
        }
      },
      {
        $limit: 40
      }
    ]).then(users => {
      users.forEach(cleanUser);

      return users;
    }));
  }

  const [gmLeaderboard, sgmLeaderboard, reqUser, rankedLeaderboard = null] = await Promise.all(promises);

  return {
    props: {
      gmLeaderboard: JSON.parse(JSON.stringify(gmLeaderboard)),
      rankedLeaderboard: JSON.parse(JSON.stringify(rankedLeaderboard)),
      reqUser: JSON.parse(JSON.stringify(reqUser)),
      sgmLeaderboard: JSON.parse(JSON.stringify(sgmLeaderboard)),
    },
  };
}

interface LeaderboardsProps {
  gmLeaderboard: UserAndSum[];
  rankedLeaderboard: User[] | null;
  reqUser: User | null;
  sgmLeaderboard: UserAndSum[];
}

export default function Leaderboards({ gmLeaderboard, rankedLeaderboard, reqUser, sgmLeaderboard }: LeaderboardsProps) {
  const { game } = useContext(AppContext);
  const [leaderboard, setLeaderboard] = useState(!game.disableRanked ? 'ranked' : 'gm');
  const gmRange = getDifficultyRangeByIndex(DIFFICULTY_INDEX.GRANDMASTER);
  const sgmRange = getDifficultyRangeByIndex(DIFFICULTY_INDEX.SUPER_GRANDMASTER);
  const gmColor = getDifficultyColor(gmRange[0]);
  const sgmColor = getDifficultyColor(sgmRange[0]);

  const leaderboardStrings = {
    ...(!game.disableRanked ? { 'ranked': 'Ranked\u00A0🏅' } : {}),
    'gm': 'Grandmasters\u00A0📜',
    'sgm': 'Super\u00A0Grandmasters\u00A0🧠',
  } as { [key: string]: string };

  const leaderboardStringsMobile = {
    ...(!game.disableRanked ? { 'ranked': 'Ranked\u00A0🏅' } : {}),
    'gm': 'GM\u00A0📜',
    'sgm': 'Super\u00A0GM\u00A0🧠',
  } as { [key: string]: string };

  function getLeaderboardTable(users: User[], values: number[]) {
    if (users.length === 0) {
      return (
        <div className='max-w-4xl mx-auto w-full'>
          <div className='bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl p-8 sm:p-12 text-center'>
            <div className='text-6xl sm:text-7xl mb-4'>🌟</div>
            <h3 className='text-xl sm:text-2xl font-bold text-white mb-2'>No Champions Yet</h3>
            <p className='text-gray-400 text-base sm:text-lg'>
              {leaderboard === 'ranked'
                ? 'Be the first to conquer the ranked ladder!'
                : leaderboard === 'gm'
                  ? 'Be the first to achieve Grandmaster status by solving 7+ Grandmaster levels!'
                  : 'Be the first to achieve Super Grandmaster status by solving 7+ Super Grandmaster levels!'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className='space-y-4 max-w-4xl mx-auto w-full'>
        {users.map((user, i) => {
          const isYou = reqUser && user._id === reqUser._id;

          return (
            <div key={user._id.toString()} className='relative group'>
              {/* Shine effect container with overflow hidden */}
              {isYou && (
                <div className='absolute inset-0 rounded-xl overflow-hidden pointer-events-none'>
                  <div className='absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent transform -skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-1000' />
                </div>
              )}
              
              {/* Main content container */}
              <div
                className={`relative bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl p-3 sm:p-4 hover:bg-black/30 transition-all duration-300 ${
                  isYou ? 'ring-2 ring-yellow-400 shadow-2xl shadow-yellow-400/20' : ''
                }`}
              >
                <div className='relative flex items-center justify-between'>
                  <div className='flex items-center gap-3 sm:gap-4 flex-1 min-w-0'>
                    {/* Rank with modern styling */}
                    <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full font-black text-lg sm:text-xl flex-shrink-0 ${
                      i === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black' :
                        i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' :
                          i === 2 ? 'bg-gradient-to-br from-orange-400 to-red-500 text-black' :
                            'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                    }`}>
                      {i + 1}
                    </div>
                  
                  {/* User info */}
                    <div className='flex items-center text-base sm:text-lg gap-2 sm:gap-3 flex-1 min-w-0'>
                      <FormattedUser id='leaderboard' size={32} user={user} />
                    </div>
                  </div>
                
                {/* Score with glass morphism effect */}
                  <div className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 sm:px-4 py-2 font-bold text-base sm:text-lg flex-shrink-0 ${
                    isYou ? 'text-yellow-400 bg-yellow-400/20 border-yellow-400/40' : 'text-white'
                  }`}>
                    <span className='text-sm font-normal opacity-80'>
                      {leaderboard === 'ranked' ? '' : 'Solved: '}
                    </span>
                    {values[i]}
                    {leaderboard === 'ranked' ? ' 🏅' : ''}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function getLeaderboard() {
    if (leaderboard === 'ranked') {
      if (game.disableRanked || !rankedLeaderboard) {
        return null;
      }

      return (
        <div className='flex flex-col text-center gap-6 sm:gap-8 max-w-4xl mx-auto px-4'>
          <div className='flex flex-col items-center gap-3 sm:gap-4'>
            <Link className='group' href='/ranked'>
              <h2 className='font-black text-2xl sm:text-3xl md:text-4xl bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 transform group-hover:scale-105'>
                Ranked Solves 🏅
              </h2>
            </Link>
            <div className='text-gray-300 text-base sm:text-lg'>The elite players who dominate the ranked ladder</div>
          </div>
          {getLeaderboardTable(rankedLeaderboard, rankedLeaderboard.map(user => user.config?.calcRankedSolves || 0))}
        </div>
      );
    } else if (leaderboard === 'sgm') {
      return (
        <div className='flex flex-col items-center text-center gap-6 sm:gap-8 max-w-4xl mx-auto px-4'>
          <div className='flex flex-col items-center gap-3 sm:gap-4'>
            <h2 className='font-black text-2xl sm:text-3xl md:text-4xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent' style={{ color: sgmColor }}>
              {game.displayName} Super Grandmasters 🧠
            </h2>
            <div className='text-gray-300 text-sm sm:text-base md:text-lg bg-black/20 backdrop-blur-sm border border-white/20 rounded-lg px-4 sm:px-6 py-2 sm:py-3'>
              Masters who have conquered at least 7 Super Grandmaster levels
            </div>
          </div>
          {getLeaderboardTable(sgmLeaderboard.map(userAndSum => userAndSum.user), sgmLeaderboard.map(userAndSum => userAndSum.sum))}
        </div>
      );
    } else if (leaderboard === 'gm') {
      return (
        <div className='flex flex-col items-center text-center gap-6 sm:gap-8 max-w-4xl mx-auto px-4'>
          <div className='flex flex-col items-center gap-3 sm:gap-4'>
            <h2 className='font-black text-2xl sm:text-3xl md:text-4xl bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent' style={{ color: gmColor }}>
              {game.displayName} Grandmasters 📜
            </h2>
            <div className='text-gray-300 text-sm sm:text-base md:text-lg bg-black/20 backdrop-blur-sm border border-white/20 rounded-lg px-4 sm:px-6 py-2 sm:py-3'>
              Legends who have solved at least 7 Grandmaster (or harder) levels
            </div>
          </div>
          {getLeaderboardTable(gmLeaderboard.map(userAndSum => userAndSum.user), gmLeaderboard.map(userAndSum => userAndSum.sum))}
        </div>
      );
    } else {
      return null;
    }
  }

  return (
    <Page title={game.displayName + ' Leaderboards'}>
      <SpaceBackground constellationPattern='leaderboard'>
        <div className='flex flex-col items-center justify-center min-h-screen px-4 py-8'>
          {/* Epic Title Section */}
          <div className='mb-8 sm:mb-12 text-center animate-fadeInDown px-4' style={{ animationDelay: '0.3s' }}>
            <h1 className='text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-4 sm:mb-6 leading-tight'>
              LEADERBOARDS
            </h1>
            <div className='text-lg sm:text-xl md:text-2xl text-gray-300 font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent'>
              {game.displayName} Hall of Fame
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className='mb-8 sm:mb-12 animate-fadeInScale px-4' style={{ animationDelay: '0.5s' }}>
            <div className='flex gap-2 sm:gap-4 bg-black/20 backdrop-blur-sm p-1.5 rounded-2xl border border-white/20'>
              {Object.keys(leaderboardStrings).map((leaderboardKey) => (
                <button
                  key={`tab-${leaderboardKey}`}
                  onClick={() => setLeaderboard(leaderboardKey)}
                  className={`
                    relative overflow-hidden px-3 sm:px-6 py-2 sm:py-3.5 rounded-xl font-bold text-sm sm:text-lg transition-all duration-300 whitespace-nowrap
                    ${leaderboard === leaderboardKey
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-xl transform scale-105'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
                }
                  `}
                >
                  {leaderboard === leaderboardKey && (
                    <div className='absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-30' />
                  )}
                  <span className='relative'>
                    <span className='sm:hidden'>{leaderboardStringsMobile[leaderboardKey]}</span>
                    <span className='hidden sm:inline'>{leaderboardStrings[leaderboardKey]}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Leaderboard Content */}
          <div className='w-full animate-fadeInUp' style={{ animationDelay: '0.7s' }}>
            {getLeaderboard()}
          </div>
        </div>
      </SpaceBackground>
    </Page>
  );
}
