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
import SpaceBackground from '../../../components/page/SpaceBackground';
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
  const isNewUser = solvedCount === 0;

  return (
    <Page title={'Play'}>
      <UpsellFullAccount user={reqUser} />
      <SpaceBackground
        constellationPattern='custom'
        customConstellations={[
          { left: '15%', top: '20%', size: '6px', color: 'bg-cyan-400', delay: '0s', duration: '3s', glow: true },
          { left: '30%', top: '15%', size: '5px', color: 'bg-purple-400', delay: '0.8s', duration: '2.5s', glow: true },
          { left: '50%', top: '25%', size: '7px', color: 'bg-pink-400', delay: '1.2s', duration: '3.5s', glow: true },
          { left: '75%', top: '18%', size: '6px', color: 'bg-yellow-400', delay: '1.8s', duration: '2.8s', glow: true },
          { left: '85%', top: '30%', size: '5px', color: 'bg-green-400', delay: '2.2s', duration: '3.2s', glow: true },
          { left: '65%', top: '35%', size: '6px', color: 'bg-blue-400', delay: '0.5s', duration: '2.9s', glow: true },
        ]}
        showGeometricShapes={true}
      >
        <div className='relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12'>
          <div className='text-center mb-8'>
            <h1 className='font-bold text-3xl sm:text-4xl lg:text-5xl mb-4 animate-fadeInDown'>
              <span className='bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent'>
                {game.displayName} Official Campaign
              </span>
            </h1>
            <p className='text-base sm:text-lg text-gray-200 max-w-2xl mx-auto animate-fadeInUp px-2' style={{ animationDelay: '0.2s' }}>
              Master the art of pathfinding through progressively challenging puzzles.
              Build your skills and climb the global leaderboards.
            </p>
          </div>
          {/* Responsive Layout: Stack on mobile, side-by-side on larger screens */}
          <div className='flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-8 items-start animate-fadeInUp' style={{ animationDelay: '0.4s' }}>

            {/* Chapters Section - Show first on mobile */}
            <div className='order-1 lg:order-2 w-full'>
              <h2 className='text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center'>
                <span className='bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent'>
                  Choose Your Chapter
                </span>
              </h2>
              <div className='flex flex-col gap-4 sm:gap-6 items-center'>
                <ChapterSelectCard chapter={1} chapterUnlocked={chapterUnlocked} highlight={isNewUser} />
                <ChapterSelectCard chapter={2} chapterUnlocked={chapterUnlocked} />
                <ChapterSelectCard chapter={3} chapterUnlocked={chapterUnlocked} />
                {chapterUnlocked >= 3 && <ChapterSelectCard chapter={4} chapterUnlocked={chapterUnlocked} />}
              </div>
            </div>
            
            {/* Progress Section - Show second on mobile */}
            <div className='order-2 lg:order-1 w-full'>
              <h2 className='text-2xl sm:text-3xl font-bold mb-4 text-center'>
                <span className='bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent'>
                  Your Progress
                </span>
              </h2>
              <div className='flex flex-col w-full items-center'>
              <PlayerRankProgress />
              </div>
            </div>

          </div>
        </div>
        {/* Additional Content Section */}
        <div className='max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12'>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 animate-fadeInUp' style={{ animationDelay: '0.6s' }}>

            {/* Thinky Academy Card */}
            <div className='relative'>
              <div className='absolute -inset-2 bg-gradient-to-r from-purple-600/15 to-blue-600/15 blur-lg opacity-40' />
              <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
                <div className='text-center mb-4'>
                  <div className='w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3'>
                    <span className='text-2xl text-white'>🎓</span>
                  </div>
                  <h3 className='text-lg font-bold'>
                    <span className='bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent'>
                      Thinky Academy
                    </span>
                  </h3>
                </div>
                <div className='text-center'>
                  <p className='text-sm text-white/80 mb-4'>
                    Master advanced strategies and techniques from top players
                  </p>
                  <div className='bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-3 border border-white/15'>
                    <span className='text-lg font-bold text-purple-300'>Coming Soon!</span>
                  </div>
                  <p className='text-xs text-white/50'>
                    Expert tutorials • Strategy guides • Pro tips
                  </p>
                </div>
              </div>
            </div>
          {/* Community Card */}
          <div className='relative'>
            <div className='absolute -inset-2 bg-gradient-to-r from-green-600/15 to-emerald-600/15 blur-lg opacity-40' />
            <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
              <div className='text-center mb-4'>
                <div className='w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3'>
                  <span className='text-2xl text-white'>👥</span>
                </div>
                <h3 className='text-lg font-bold'>
                  <span className='bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent'>
                    Community
                  </span>
                </h3>
              </div>
              <div className='text-center text-sm text-white/80'>
                <p className='mb-4'>Join our vibrant community</p>
                <div className='space-y-3 flex flex-col items-stretch'>
                  <a
                    href='https://discord.gg/j6RxRdqq4A'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center justify-center gap-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg transition-all duration-200 hover:scale-105 transform font-medium'
                  >
                    <svg className='w-5 h-5' viewBox='0 0 24 24' fill='currentColor'>
                      <path d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z' />
                    </svg>
                    Join Discord Community
                  </a>
                  <button
                    onClick={() => window.location.href = '/api/auth/discord'}
                    className='flex items-center justify-center gap-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg transition-all duration-200 hover:scale-105 transform font-medium'
                  >
                  <svg className='w-5 h-5' viewBox='0 0 24 24' fill='currentColor'>
                    <path d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z' />
                  </svg>
                  Connect Discord
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Thinky Pro Card */}
          {!isPro(reqUser) && (
            <div className='relative'>
              <div className='absolute -inset-2 bg-gradient-to-r from-blue-600/15 to-cyan-600/15 blur-lg opacity-40' />
              <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
                <div className='text-center mb-4'>
                  <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-3'>
                    <Image alt='pro' src='/pro.svg' width='24' height='24' />
                  </div>
                  <h3 className='text-lg font-bold'>
                    <span className='bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent'>
                      Thinky Pro
                    </span>
                  </h3>
                </div>
                <div className='text-center text-sm text-white/80'>
                  <p className='mb-3'>Unlock premium features</p>
                  <ul className='text-xs space-y-1 mb-4 text-left inline-block text-white/60'>
                    <li>Timeline Scrubber & Redo</li>
                    <li>Save Checkpoints</li>
                    <li>Advanced Search Filters</li>
                    <li>User Insights & Stats</li>
                  </ul>
                  <Link
                    href='/pro'
                    className='inline-flex items-center justify-center px-4 py-2 bg-white/12 backdrop-blur-md hover:bg-white/20 text-white font-bold rounded-lg transition-all duration-200 border border-white/25 hover:scale-105 transform'
                  >
                    Upgrade to Pro
                  </Link>
                </div>
              </div>
            </div>
          )}
          {/* Achievement Card for Pro users */}
          {isPro(reqUser) && (
            <div className='relative'>
              <div className='absolute -inset-2 bg-gradient-to-r from-yellow-600/15 to-orange-600/15 blur-lg opacity-40' />
              <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
                <div className='text-center mb-4'>
                  <div className='w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3'>
                    <span className='text-2xl text-white'>🏆</span>
                  </div>
                  <h3 className='text-lg font-bold'>
                    <span className='bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent'>
                      Achievements
                    </span>
                  </h3>
                </div>
                <div className='text-center text-sm text-white/80'>
                  <p className='mb-4'>Track your progress and unlock rewards</p>
                  <Link
                    href='/achievements'
                    className='inline-flex items-center justify-center px-4 py-2 bg-white/12 backdrop-blur-md hover:bg-white/20 text-white font-bold rounded-lg transition-all duration-200 border border-white/25 hover:scale-105 transform'
                  >
                    View Achievements
                  </Link>
                </div>
              </div>
            </div>
          )}

          </div>
        </div>
      </SpaceBackground>
    </Page>
  );
}
