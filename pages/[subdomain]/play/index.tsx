import UpsellFullAccount from '@root/components/home/upsellFullAccount';
import LoadingSpinner from '@root/components/page/loadingSpinner';
import PlayerRank from '@root/components/profile/playerRank';
import PlayerRankProgress from '@root/components/progress/playerRankProgress';
import { AppContext } from '@root/contexts/appContext';
import { getGameFromId, getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import useSWRHelper from '@root/hooks/useSWRHelper';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useContext } from 'react';
import ChapterSelectCard from '../../../components/cards/chapterSelectCard';
import Page from '../../../components/page/page';
import { getUserFromToken } from '../../../lib/withAuth';
import User from '../../../models/db/user';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const gameId = getGameIdFromReq(context.req as NextApiRequest);
  const game = getGameFromId(gameId);

  if (!reqUser || game.disableCampaign) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {
      reqUser: JSON.parse(JSON.stringify(reqUser)),
    },
  };
}

interface PlayPageProps {
  reqUser: User;
}

/* istanbul ignore next */
export default function PlayPage({ reqUser }: PlayPageProps) {
  const { game } = useContext(AppContext);
  const chapterUnlocked = reqUser.config?.chapterUnlocked ?? 1;
  const { data: profileDataFetched } = useSWRHelper<{levelsSolvedByDifficulty: {[key: string]: number}}>('/api/user/' + reqUser?._id + '?type=levelsSolvedByDifficulty', {}, {});
  const levelsSolvedByDifficulty = profileDataFetched?.levelsSolvedByDifficulty;

  const solvedCount = reqUser.config?.calcLevelsSolvedCount ?? 0;
  const isNewUser = solvedCount < 5;

  return (
    <Page title={'Play'}>
      <UpsellFullAccount user={reqUser} />
      
      {/* Hero Section */}
      <div className='relative bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden'>
        <div className='absolute inset-0 bg-grid-pattern opacity-5'></div>
        <div className='relative max-w-7xl mx-auto px-4 py-12'>
          <div className='text-center mb-8'>
            <h1 className='font-bold text-4xl lg:text-5xl mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
              {game.displayName} Official Campaign
            </h1>
            <p className='text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto'>
              Master the art of pathfinding through progressively challenging puzzles. 
              Build your skills and climb the global leaderboards.
            </p>
          </div>

          {/* Desktop Layout: Side-by-side for larger screens */}
          <div className='grid lg:grid-cols-2 gap-8 items-start'>
            
            {/* Progress Section */}
            <div className='order-2 lg:order-1'>
              {isNewUser ? (
                <div className="w-full">
                  <h2 className="text-2xl font-bold mb-4 text-center lg:text-left">Your Journey Begins</h2>
                  <PlayerRankProgress />
                </div>
              ) : (
                <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border'>
                  <h2 className="text-2xl font-bold mb-4">Your Progress</h2>
                  
                  {/* Current Rank Display */}
                  <div className='flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-lg'>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Current Rank</div>
                      <div className='flex items-center gap-3'>
                        {levelsSolvedByDifficulty ? (
                          <PlayerRank levelsSolvedByDifficulty={levelsSolvedByDifficulty} user={reqUser} />
                        ) : (
                          <LoadingSpinner size={24} />
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 dark:text-gray-300">Levels Solved</div>
                      <div className="text-2xl font-bold text-blue-600">{solvedCount}</div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-300">Chapters Unlocked</div>
                      <div className="text-xl font-bold text-green-600">{chapterUnlocked}</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-300">Completion</div>
                      <div className="text-xl font-bold text-purple-600">{Math.round((solvedCount / (chapterUnlocked * 50)) * 100)}%</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chapters Section */}
            <div className='order-1 lg:order-2'>
              <h2 className="text-2xl font-bold mb-6 text-center lg:text-left">Choose Your Chapter</h2>
              <div className='flex flex-col gap-6'>
                <ChapterSelectCard chapter={1} chapterUnlocked={chapterUnlocked} />
                <ChapterSelectCard chapter={2} chapterUnlocked={chapterUnlocked} />
                <ChapterSelectCard chapter={3} chapterUnlocked={chapterUnlocked} />
                {chapterUnlocked >= 3 && <ChapterSelectCard chapter={4} chapterUnlocked={chapterUnlocked} />}
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* Additional Content Section */}
      <div className='max-w-7xl mx-auto px-4 py-12'>
        <div className='grid md:grid-cols-3 gap-8'>
          
          {/* Tips Card */}
          <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border'>
            <div className='text-center mb-4'>
              <div className='w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3'>
                <span className='text-2xl'>💡</span>
              </div>
              <h3 className='text-lg font-bold'>Pro Tips</h3>
            </div>
            <ul className='text-sm text-gray-600 dark:text-gray-300 space-y-2'>
              <li>• Plan your path before moving</li>
              <li>• Look for optimal solutions</li>
              <li>• Practice makes perfect</li>
              <li>• Learn from failed attempts</li>
            </ul>
          </div>

          {/* Community Card */}
          <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border'>
            <div className='text-center mb-4'>
              <div className='w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3'>
                <span className='text-2xl'>👥</span>
              </div>
              <h3 className='text-lg font-bold'>Community</h3>
            </div>
            <div className='text-center text-sm text-gray-600 dark:text-gray-300'>
              <p className='mb-3'>Join thousands of players</p>
              <div className='flex justify-center gap-4'>
                <div>
                  <div className='font-bold text-blue-600'>50K+</div>
                  <div className='text-xs'>Players</div>
                </div>
                <div>
                  <div className='font-bold text-green-600'>1M+</div>
                  <div className='text-xs'>Levels Solved</div>
                </div>
              </div>
            </div>
          </div>

          {/* Achievement Card */}
          <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border'>
            <div className='text-center mb-4'>
              <div className='w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-3'>
                <span className='text-2xl'>🏆</span>
              </div>
              <h3 className='text-lg font-bold'>Achievements</h3>
            </div>
            <div className='text-center text-sm text-gray-600 dark:text-gray-300'>
              <p className='mb-3'>Unlock rewards as you progress</p>
              <div className='space-y-1'>
                <div className='text-xs bg-gray-100 dark:bg-gray-700 rounded px-2 py-1'>Speed Solver</div>
                <div className='text-xs bg-gray-100 dark:bg-gray-700 rounded px-2 py-1'>Perfect Path</div>
                <div className='text-xs bg-gray-100 dark:bg-gray-700 rounded px-2 py-1'>Chapter Master</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Page>
  );
}
