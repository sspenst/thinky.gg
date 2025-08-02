import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { DIFFICULTY_INDEX, getDifficultyColor, getDifficultyRangeByIndex } from '@root/components/formatted/formattedDifficulty';
import FormattedUser from '@root/components/formatted/formattedUser';
import Page from '@root/components/page/page';
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
import React, { Fragment, useContext, useState } from 'react';

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
  const [leaderboard, setLeaderboard] = useState(!game.disableRanked ? 'ranked' : 'sgm');
  const gmRange = getDifficultyRangeByIndex(DIFFICULTY_INDEX.GRANDMASTER);
  const sgmRange = getDifficultyRangeByIndex(DIFFICULTY_INDEX.SUPER_GRANDMASTER);
  const gmColor = getDifficultyColor(gmRange[0]);
  const sgmColor = getDifficultyColor(sgmRange[0]);

  const leaderboardStrings = {
    ...(!game.disableRanked ? { 'ranked': 'Ranked 🏅' } : {}),
    'sgm': 'Super Grandmasters 🧠',
    'gm': 'Grandmasters 📜',
  } as { [key: string]: string };

  function getLeaderboardTable(users: User[], values: number[]) {
    return (
      <div className='space-y-4'>
        {users.map((user, i) => {
          const isYou = reqUser && user._id === reqUser._id;

          return (
            <div
              key={user._id.toString()}
              className={`relative overflow-hidden bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl p-3 sm:p-4 hover:bg-black/30 transition-all duration-300 group ${
                isYou ? 'ring-2 ring-yellow-400 shadow-2xl shadow-yellow-400/20' : ''
              }`}
            >
              {/* Animated shine effect for current user */}
              {isYou && (
                <div className='absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent transform -skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-1000' />
              )}
              
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
                  {values[i]}
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
      {/* Epic Space-Themed Background */}
      <div className='relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden'>
        {/* Animated Star Field Background */}
        <div className='absolute inset-0 animate-fadeIn'>
          {/* Regular stars */}
          {[...Array(60)].map((_, i) => {
            // Use deterministic values based on index to avoid hydration mismatch
            const pseudoRandom = (seed: number, max: number) => ((seed * 9.869604401089358) % max);
            const left = pseudoRandom(i * 2.3, 100);
            const top = pseudoRandom(i * 3.7, 100);
            const size = pseudoRandom(i * 1.3, 3) + 1;
            const delay = pseudoRandom(i * 2.1, 4);
            const duration = pseudoRandom(i * 1.7, 3) + 1;

            return (
              <div
                key={i}
                className='absolute bg-white rounded-full animate-pulse'
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  animationDelay: `${delay}s`,
                  animationDuration: `${duration}s`,
                }}
              />
            );
          })}
          
          {/* Leaderboard-themed constellation stars */}
          {[...Array(8)].map((_, i) => (
            <div
              key={`leaderboard-star-${i}`}
              className='absolute bg-yellow-400 rounded-full animate-pulse'
              style={{
                left: `${20 + (i % 3) * 25}%`,
                top: `${15 + Math.floor(i / 3) * 20}%`,
                width: '5px',
                height: '5px',
                animationDelay: `${i * 0.3}s`,
                animationDuration: '2.5s',
                boxShadow: '0 0 10px rgba(250, 204, 21, 0.7)',
              }}
            />
          ))}
          
          {/* Champion constellation - golden stars for top players */}
          <div
            className='absolute bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse'
            style={{
              left: '85%',
              top: '20%',
              width: '8px',
              height: '8px',
              animationDuration: '1.8s',
              boxShadow: '0 0 16px rgba(250, 204, 21, 0.9)',
            }}
          />
        </div>
        
        {/* Floating Geometric Shapes */}
        <div className='absolute inset-0 animate-fadeIn' style={{ animationDelay: '0.3s' }}>
          <div className='absolute top-20 left-10 w-32 h-32 border-4 border-cyan-400 transform rotate-45 animate-spin opacity-10' style={{ animationDuration: '25s' }} />
          <div className='absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 transform rotate-12 animate-bounce opacity-10' style={{ animationDelay: '1s' }} />
          <div className='absolute bottom-32 left-1/4 w-16 h-16 border-4 border-yellow-400 rounded-full animate-pulse opacity-10' style={{ animationDelay: '2s' }} />
          <div className='absolute bottom-20 right-1/3 w-20 h-20 bg-gradient-to-r from-blue-500 to-green-500 transform -rotate-12 animate-bounce opacity-10' style={{ animationDelay: '1.5s' }} />
          <div className='absolute top-1/2 left-8 w-28 h-28 border-4 border-pink-400 transform rotate-12 animate-spin opacity-10' style={{ animationDuration: '30s' }} />
        </div>
        
        {/* Bottom Gradient Overlay */}
        <div className='absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-indigo-900 via-purple-900/50 to-transparent z-5' />
        
        <div className='relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8'>
          {/* Epic Title Section */}
          <div className='mb-8 sm:mb-12 text-center animate-fadeInDown px-4' style={{ animationDelay: '0.3s' }}>
            <h1 className='text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-4 sm:mb-6 leading-tight'>
              LEADERBOARDS
            </h1>
            <div className='text-lg sm:text-xl md:text-2xl text-gray-300 font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent'>
              {game.displayName} Hall of Fame
            </div>
          </div>
          
                     {/* Modern Dropdown Menu */}
           <div className='mb-8 sm:mb-12 animate-fadeInScale px-4' style={{ animationDelay: '0.5s' }}>
             <Menu as='div' className='relative inline-block text-left'>
               <MenuButton className='group relative overflow-hidden bg-black/20 backdrop-blur-sm border border-white/20 hover:bg-black/30 text-white font-black py-3 sm:py-4 px-6 sm:px-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg sm:text-xl'>
                 <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-10 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-700' />
                 <div className='relative flex items-center gap-2 sm:gap-3'>
                   {leaderboardStrings[leaderboard]}
                   <svg className='h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:rotate-180' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'>
                     <path fillRule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clipRule='evenodd' />
                   </svg>
                 </div>
               </MenuButton>
              
              <Transition
                as={Fragment}
                enter='transition ease-out duration-200'
                enterFrom='transform opacity-0 scale-95'
                enterTo='transform opacity-100 scale-100'
                leave='transition ease-in duration-150'
                leaveFrom='transform opacity-100 scale-100'
                leaveTo='transform opacity-0 scale-95'
              >
                                 <MenuItems className='absolute right-0 z-20 mt-2 rounded-xl overflow-hidden bg-black/40 backdrop-blur-lg border border-white/20 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none min-w-full sm:min-w-80'>
                   <div className='py-2'>
                     {Object.keys(leaderboardStrings).map(leaderboardKey => (
                       <MenuItem key={`leaderboard-${leaderboardKey}`}>
                         <button
                           className='group relative overflow-hidden text-white p-3 sm:p-4 text-lg sm:text-xl font-bold w-full flex items-center gap-2 sm:gap-3 justify-center hover:bg-white/10 transition-all duration-200'
                           onClick={() => setLeaderboard(leaderboardKey)}
                         >
                           <div className='absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200' />
                           <span className='relative'>{leaderboardStrings[leaderboardKey]}</span>
                         </button>
                       </MenuItem>
                     ))}
                  </div>
                </MenuItems>
              </Transition>
            </Menu>
          </div>
          
          {/* Leaderboard Content */}
          <div className='w-full animate-fadeInUp' style={{ animationDelay: '0.7s' }}>
            {getLeaderboard()}
          </div>
        </div>
      </div>
    </Page>
  );
}
