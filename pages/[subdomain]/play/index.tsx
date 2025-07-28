import UpsellFullAccount from '@root/components/home/upsellFullAccount';
import PlayerRankProgress from '@root/components/progress/playerRankProgress';
import { AppContext } from '@root/contexts/appContext';
import { getGameFromId, getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import isPro from '@root/helpers/isPro';
import useSWRHelper from '@root/hooks/useSWRHelper';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Image from 'next/image';
import Link from 'next/link';
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
  const _levelsSolvedByDifficulty = profileDataFetched?.levelsSolvedByDifficulty;

  const solvedCount = reqUser.config?.calcLevelsSolvedCount ?? 0;
  const _isNewUser = solvedCount < 5;

  return (
    <Page title={'Play'}>
      <UpsellFullAccount user={reqUser} />
      {/* Hero Section */}
      <div className='relative bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden'>
        <div className='absolute inset-0 bg-grid-pattern opacity-5' />
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
              <div className='w-full'>
                <h2 className='text-2xl font-bold mb-4 text-center lg:text-left'>Your Progress</h2>
                <PlayerRankProgress />
              </div>
            </div>
            {/* Chapters Section */}
            <div className='order-1 lg:order-2'>
              <h2 className='text-2xl font-bold mb-6 text-center lg:text-left'>Choose Your Chapter</h2>
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

          {/* Thinky Academy Card */}
          <div className='bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 shadow-lg border border-purple-200 dark:border-purple-700'>
            <div className='text-center mb-4'>
              <div className='w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3'>
                <span className='text-2xl text-white'>🎓</span>
              </div>
              <h3 className='text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent'>Thinky Academy</h3>
            </div>
            <div className='text-center'>
              <p className='text-sm text-gray-600 dark:text-gray-300 mb-4'>
                Master advanced strategies and techniques from top players
              </p>
              <div className='bg-purple-100 dark:bg-purple-900/30 rounded-lg p-3 mb-3'>
                <span className='text-lg font-bold text-purple-600 dark:text-purple-400'>Coming Soon!</span>
              </div>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                Expert tutorials • Strategy guides • Pro tips
              </p>
            </div>
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
              <div className='flex justify-center gap-4 mb-4'>
                <div>
                  <div className='font-bold text-blue-600'>50K+</div>
                  <div className='text-xs'>Players</div>
                </div>
                <div>
                  <div className='font-bold text-green-600'>1M+</div>
                  <div className='text-xs'>Levels Solved</div>
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/api/auth/discord'}
                className='inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors'
              >
                <svg className='w-5 h-5' viewBox='0 0 24 24' fill='currentColor'>
                  <path d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z' />
                </svg>
                Connect Discord
              </button>
            </div>
          </div>
          {/* Thinky Pro Card */}
          {!isPro(reqUser) && (
            <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border'>
              <div className='text-center mb-4'>
                <div className='w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3'>
                  <Image alt='pro' src='/pro.svg' width='24' height='24' />
                </div>
                <h3 className='text-lg font-bold'>Thinky Pro</h3>
              </div>
              <div className='text-center text-sm text-gray-600 dark:text-gray-300'>
                <p className='mb-3'>Unlock premium features</p>
                <ul className='text-xs space-y-1 mb-4 text-left inline-block'>
                  <li>Timeline Scrubber & Redo</li>
                  <li>Save Checkpoints</li>
                  <li>Advanced Search Filters</li>
                  <li>User Insights & Stats</li>
                </ul>
                <Link
                  href='/pro'
                  className='inline-flex items-center justify-center px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded focus:outline-none focus:shadow-outline cursor-pointer'
                >
                  Upgrade to Pro
                </Link>
              </div>
            </div>
          )}
          {/* Achievement Card for Pro users */}
          {isPro(reqUser) && (
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
          )}

        </div>
      </div>
    </Page>
  );
}
