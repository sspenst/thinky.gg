import UpsellFullAccount from '@root/components/home/upsellFullAccount';
import AchievementCategory from '@root/constants/achievements/achievementCategory';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { refreshAchievements } from '@root/helpers/refreshAchievements';
import useSWRHelper from '@root/hooks/useSWRHelper';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import FormattedCampaign from '../../../../components/formatted/formattedCampaign';
import { difficultyList } from '../../../../components/formatted/formattedDifficulty';
import LinkInfo from '../../../../components/formatted/linkInfo';
import Page from '../../../../components/page/page';
import getCampaignProps, { CampaignProps } from '../../../../helpers/getCampaignProps';
import { getUserFromToken } from '../../../../lib/withAuth';
import { EnrichedLevel } from '../../../../models/db/level';
import { UserConfigModel } from '../../../../models/mongoose';

interface ChapterPageProps extends CampaignProps {
  chapterNumber: number;
}

const chapterConfig = {
  1: {
    title: 'Chapter 1',
    subtitle: 'Grassroots',
    campaign: 'chapter1',
  },
  2: {
    title: 'Chapter 2',
    subtitle: 'Into the Depths',
    campaign: 'chapter2',
  },
  3: {
    title: 'Chapter 3',
    subtitle: 'Brain Busters',
    campaign: 'chapter3',
  },
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const gameId = getGameIdFromReq(context.req);
  const chapterNumber = parseInt(context.params?.chapterNumber as string);

  if (!reqUser) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  // Validate chapter number
  if (!chapterConfig[chapterNumber as keyof typeof chapterConfig]) {
    return {
      notFound: true,
    };
  }

  const chapterUnlocked = reqUser.config?.chapterUnlocked ?? 1;
  const config = chapterConfig[chapterNumber as keyof typeof chapterConfig];

  // Handle chapter unlocking logic
  if (chapterNumber === 2 && chapterUnlocked === 1) {
    const { props } = await getCampaignProps(gameId, reqUser, 'chapter1');

    if (!props) {
      return {
        redirect: {
          destination: '/play',
          permanent: false,
        },
      };
    }

    const remainingLevels = Math.ceil(props.totalLevels * 0.75) - props.solvedLevels;
    const isChapter1Complete = remainingLevels <= 0 && props.enrichedCollections.filter(c => !c.isThemed).every(c => Math.ceil(c.levelCount * 0.5) - c.userSolvedCount <= 0);

    if (!isChapter1Complete) {
      return {
        redirect: {
          destination: '/play',
          permanent: false,
        },
      };
    }

    await Promise.all([
      UserConfigModel.updateOne({ userId: reqUser._id, gameId: gameId }, { $set: { chapterUnlocked: 2 } }),
      refreshAchievements(gameId, reqUser._id, [AchievementCategory.PROGRESS, AchievementCategory.CHAPTER_COMPLETION])
    ]);
  } else if (chapterNumber === 3 && chapterUnlocked <= 2) {
    if (chapterUnlocked === 1) {
      return {
        redirect: {
          destination: '/play',
          permanent: false,
        },
      };
    }

    const { props } = await getCampaignProps(gameId, reqUser, 'chapter2');

    if (!props) {
      return {
        redirect: {
          destination: '/play',
          permanent: false,
        },
      };
    }

    const remainingLevels = Math.ceil(props.totalLevels * 0.75) - props.solvedLevels;
    const isChapter2Complete = remainingLevels <= 0 && props.enrichedCollections.filter(c => !c.isThemed).every(c => Math.ceil(c.levelCount * 0.5) - c.userSolvedCount <= 0);

    if (!isChapter2Complete) {
      return {
        redirect: {
          destination: '/play',
          permanent: false,
        },
      };
    }

    await Promise.all([
      UserConfigModel.updateOne({ userId: reqUser._id, gameId: gameId }, { $set: { chapterUnlocked: 3 } }),
      refreshAchievements(gameId, reqUser._id, [AchievementCategory.PROGRESS, AchievementCategory.CHAPTER_COMPLETION])
    ]);
  }

  // Check if user has access to this chapter
  if (chapterNumber > chapterUnlocked && chapterNumber > 1) {
    return {
      redirect: {
        destination: '/play',
        permanent: false,
      },
    };
  }

  const campaignProps = await getCampaignProps(gameId, reqUser, config.campaign);

  // If this is a "continue playing" request (has continue query param), redirect to first unsolved level
  if (context.query.continue === 'true' && campaignProps.props) {
    const firstUnsolvedLevel = findFirstUnsolvedLevel(campaignProps.props.enrichedCollections);

    if (firstUnsolvedLevel) {
      // Find the collection that contains this level to get the collection ID
      let collectionId = '';

      for (const collection of campaignProps.props.enrichedCollections) {
        if (collection.levels?.some((level: EnrichedLevel) => level._id.toString() === firstUnsolvedLevel._id.toString())) {
          collectionId = collection._id.toString();
          break;
        }
      }

      return {
        redirect: {
          destination: `/level/${firstUnsolvedLevel.slug}?cid=${collectionId}&chapter=${chapterNumber}`,
          permanent: false,
        },
      };
    }
  }

  return {
    props: {
      ...campaignProps.props,
      chapterNumber,
    },
  };
}

// Helper function to find the first unsolved level in collections
function findFirstUnsolvedLevel(enrichedCollections: any[]): EnrichedLevel | null {
  for (const collection of enrichedCollections) {
    if (!collection.levels) continue;

    for (const level of collection.levels as EnrichedLevel[]) {
      // A level is unsolved if userMoves doesn't equal leastMoves or userMoves is undefined
      if (!level.userMoves || level.userMoves !== level.leastMoves) {
        return level;
      }
    }
  }

  return null;
}

interface SkillAchievement {
  achievementType: string;
  difficultyIndex: number;
  requirement: number;
  userProgress: number;
  isUnlocked: boolean;
  count: number;
  percentile: number;
}

interface PlayerRankProgressData {
  skillAchievements: SkillAchievement[];
  totalActiveUsers: number;
}

function getCurrentRankFromData(rankData: PlayerRankProgressData | undefined) {
  if (!rankData) {
    return { name: 'Loading...', emoji: '⏳' };
  }

  // Find highest achieved rank (same logic as PlayerRankProgress)
  const achievedRanks = rankData.skillAchievements.filter(ach => ach.isUnlocked);
  const highestAchievedIndex = achievedRanks.length > 0 ?
    Math.max(...achievedRanks.map(ach => ach.difficultyIndex)) : 0;

  if (highestAchievedIndex === 0) {
    return { name: 'Newb', emoji: '🆕' };
  }

  const rank = difficultyList[highestAchievedIndex];

  return { name: rank.name, emoji: rank.emoji };
}

export default function ChapterPage({ enrichedCollections, reqUser, solvedLevels, totalLevels, chapterNumber }: ChapterPageProps) {
  const { data: rankData } = useSWRHelper<PlayerRankProgressData>('/api/player-rank-stats');
  const config = chapterConfig[chapterNumber as keyof typeof chapterConfig];
  const chapterUnlocked = reqUser.config?.chapterUnlocked ?? 1;
  const currentRank = getCurrentRankFromData(rankData);

  const getNextChapterHref = () => {
    if (chapterNumber < 3) {
      return `/chapter/${chapterNumber + 1}`;
    }

    return '/ranked';
  };

  const getNextChapterTitle = () => {
    if (chapterNumber < 3 && chapterUnlocked <= chapterNumber) {
      return `Unlock Chapter ${chapterNumber + 1}`;
    }

    return undefined;
  };

  const getSolvedElement = () => {
    const nextChapter = chapterNumber + 1;
    const hasNextChapter = nextChapter <= 3;
    const nextHref = hasNextChapter ? `/chapter/${nextChapter}` : '/ranked';
    const nextTitle = hasNextChapter ? `Chapter ${nextChapter}` : 'Ranked Levels';

    return (
      <div className='flex flex-col items-center justify-center text-center mt-2 bg-2 border-color-3 border p-3 m-3 rounded-lg'>
        <div className='text-xl'>
          Congratulations!
          <br /><br />
          You&apos;ve solved every level in {config.title}.
          <br /><br />
          {hasNextChapter ? (
            <>Try out <Link className='font-bold underline text-blue-500' href={nextHref} passHref>{nextTitle}</Link> next!</>
          ) : (
            <>Try out <Link className='font-bold underline text-blue-500' href={nextHref} passHref>Ranked 🏅</Link> levels next!</>
          )}
        </div>
      </div>
    );
  };

  return (
    <Page folders={[new LinkInfo('Play', '/play')]} title={config.title}>
      <UpsellFullAccount user={reqUser} />
      
      {/* Game World Map Style Header */}
      <div className='relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden'>
        {/* Animated Star Field Background with Progress Constellations */}
        <div className='absolute inset-0 animate-fadeIn'>
          {/* Regular stars */}
          {[...Array(40)].map((_, i) => {
            // Use deterministic values based on index to avoid hydration mismatch
            const pseudoRandom = (seed: number, max: number) => ((seed * 9.869604401089358) % max);
            const left = pseudoRandom(i * 2.3, 100);
            const top = pseudoRandom(i * 3.7, 100);
            const size = pseudoRandom(i * 1.3, 3) + 1;
            const delay = pseudoRandom(i * 2.1, 3);
            const duration = pseudoRandom(i * 1.7, 2) + 1;

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
          
          {/* Progress Constellation - represents completed levels */}
          {[...Array(Math.min(solvedLevels, 12))].map((_, i) => (
            <div
              key={`progress-star-${i}`}
              className='absolute bg-green-400 rounded-full animate-pulse'
              style={{
                left: `${15 + (i % 4) * 20}%`,
                top: `${20 + Math.floor(i / 4) * 15}%`,
                width: '4px',
                height: '4px',
                animationDelay: `${i * 0.2}s`,
                animationDuration: '2s',
                boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
              }}
            />
          ))}
          
          {/* Achievement Constellation - special bright stars for major milestones */}
          {chapterNumber === 1 && (reqUser.config?.calcLevelsSolvedCount ?? 0) >= 5 && (
            <div
              className='absolute bg-yellow-400 rounded-full animate-pulse'
              style={{
                left: '85%',
                top: '25%',
                width: '6px',
                height: '6px',
                animationDuration: '1.5s',
                boxShadow: '0 0 12px rgba(250, 204, 21, 0.8)',
              }}
            />
          )}
          
          {/* Chapter completion constellation */}
          {solvedLevels === totalLevels && (
            <div
              className='absolute bg-purple-400 rounded-full animate-bounce'
              style={{
                left: '80%',
                top: '15%',
                width: '8px',
                height: '8px',
                animationDuration: '2s',
                boxShadow: '0 0 16px rgba(168, 85, 247, 0.9)',
              }}
            />
          )}
          
          {/* Floating Current Rank Display */}
          <div className='w-full pt-4 justify-center flex items-center align-middle items-center z-20 animate-fadeInDown' style={{ animationDelay: '0.5s' }}>
            <Link href='/achievements#category-LEVEL_COMPLETION' className='block hover:scale-105 transition-transform duration-300'>
              <div className='bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 sm:px-6 sm:py-4 text-white text-center cursor-pointer hover:bg-black/30 transition-colors duration-300'>
                <div className='text-xs opacity-70 mb-2'>CURRENT RANK</div>
                <div className='flex items-center justify-center gap-2 mb-1'>
                  <span className='text-lg sm:text-2xl'>{currentRank.emoji}</span>
                  <span className='text-lg sm:text-xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent'>
                    {currentRank.name}
                  </span>
                </div>
                {rankData && (
                  <div className='text-xs opacity-60'>
                    {(() => {
                      const achievedRanks = rankData.skillAchievements.filter(ach => ach.isUnlocked);
                      const highestAchievedIndex = achievedRanks.length > 0 ?
                        Math.max(...achievedRanks.map(ach => ach.difficultyIndex)) : 0;

                      if (highestAchievedIndex === 0) {
                        return 'Start solving to earn your first rank!';
                      }

                      const currentRankAch = rankData.skillAchievements.find(ach => ach.difficultyIndex === highestAchievedIndex);

                      return currentRankAch ? `Top ${currentRankAch.percentile}% of players` : 'Ranked player';
                    })()}
                  </div>
                )}
              </div>
            </Link>
          </div>
          
          {/* Floating Chapter Progress */}
          <div className='absolute bottom-24 left-4 sm:bottom-32 sm:left-6 lg:bottom-40 lg:left-12 animate-fadeInLeft' style={{ animationDelay: '0.7s' }}>
            <div className='bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-white'>
              <div className='text-xs opacity-70 mb-1'>CHAPTER {chapterNumber}</div>
              <div className='text-sm sm:text-lg font-black bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent'>
                {Math.round((solvedLevels / totalLevels) * 100)}% Complete
              </div>
            </div>
          </div>
          
          {/* Floating Next Chapter Info */}
          {solvedLevels < totalLevels && (
            <div className='absolute bottom-24 right-4 sm:bottom-32 sm:right-6 lg:bottom-40 lg:right-12 animate-fadeInRight' style={{ animationDelay: '0.9s' }}>
              <div className='bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-white text-right'>
                <div className='text-xs opacity-70 mb-1'>TO NEXT CHAPTER</div>
                <div className='text-sm sm:text-lg font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent'>
                  {totalLevels - solvedLevels} levels
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Floating Geometric Shapes */}
        <div className='absolute inset-0 animate-fadeIn' style={{ animationDelay: '0.3s' }}>
          <div className='absolute top-20 left-10 w-32 h-32 border-4 border-cyan-400 transform rotate-45 animate-spin opacity-10' style={{ animationDuration: '20s' }} />
          <div className='absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 transform rotate-12 animate-bounce opacity-10' style={{ animationDelay: '1s' }} />
          <div className='absolute bottom-32 left-1/4 w-16 h-16 border-4 border-yellow-400 rounded-full animate-pulse opacity-10' style={{ animationDelay: '2s' }} />
          <div className='absolute bottom-20 right-1/3 w-20 h-20 bg-gradient-to-r from-blue-500 to-green-500 transform -rotate-12 animate-bounce opacity-10' style={{ animationDelay: '1.5s' }} />
        </div>
        
        {/* Bottom Gradient Overlay for smooth transition */}
        <div className='absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-indigo-900 via-purple-900/50 to-transparent z-5' />
        <div className='relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8'>
          {/* Chapter Title */}
          <div className='mb-8 sm:mb-10 animate-fadeInDown' style={{ animationDelay: '0.3s' }}>
            <div className='text-yellow-400 font-black text-2xl sm:text-3xl text-center'>
              {config.title}
            </div>
          </div>
          
          {/* Dramatic Title */}
          <h1 className='text-4xl sm:text-6xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-6 text-center leading-tight px-2 animate-fadeInScale' style={{ animationDelay: '0.5s' }}>
            {config.subtitle}
          </h1>
          
          {/* Epic Progress Ring */}
          <div className='relative mb-8 sm:mb-12 animate-fadeInScale' style={{ animationDelay: '0.7s' }}>
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
                stroke='url(#progressGradient)'
                strokeWidth='8'
                strokeLinecap='round'
                strokeDasharray={`${2 * Math.PI * 112}`}
                strokeDashoffset={`${2 * Math.PI * 112 * (1 - solvedLevels / totalLevels)}`}
                className='transition-all duration-2000 ease-out'
              />
              <defs>
                <linearGradient id='progressGradient' x1='0%' y1='0%' x2='100%' y2='100%'>
                  <stop offset='0%' stopColor='#06b6d4' />
                  <stop offset='50%' stopColor='#8b5cf6' />
                  <stop offset='100%' stopColor='#ec4899' />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Center content */}
            <div className='absolute inset-0 flex flex-col items-center justify-center'>
              <div className='text-3xl sm:text-5xl font-black text-white mb-2'>{Math.round((solvedLevels / totalLevels) * 100)}%</div>
              <div className='text-sm sm:text-lg text-gray-300 font-bold'>{solvedLevels}/{totalLevels}</div>
              <div className='text-xs sm:text-sm text-gray-400'>COMPLETE</div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className='flex flex-col sm:flex-row gap-4 sm:gap-6 mb-8 sm:mb-12 items-center justify-center animate-fadeInUp' style={{ animationDelay: '0.9s' }}>
            {solvedLevels < totalLevels && (
              <Link
                href={`/chapter/${chapterNumber}?continue=true`}
                className='group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black py-4 sm:py-6 px-8 sm:px-12 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300'
              >
                <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-700' />
                <div className='relative flex items-center gap-3 sm:gap-4 justify-center'>
                  <div className='text-2xl sm:text-3xl'>⚡</div>
                  <div className='text-center'>
                    <div className='text-xl sm:text-2xl'>CONTINUE</div>
                    <div className='text-xs sm:text-sm opacity-80'>Resume Journey</div>
                  </div>
                </div>
              </Link>
            )}
            
            <Link
              href={chapterUnlocked > 3 ? '/ranked' : '/play'}
              className='group relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-black py-4 sm:py-6 px-8 sm:px-12 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300'
            >
              <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-700' />
              <div className='relative flex items-center gap-3 sm:gap-4 justify-center'>
                <div className='text-2xl sm:text-3xl'>{chapterUnlocked > 3 ? '🏆' : '🏠'}</div>
                <div className='text-center'>
                  <div className='text-xl sm:text-2xl'>EXPLORE</div>
                  <div className='text-xs sm:text-sm opacity-80'>{chapterUnlocked > 3 ? 'Ranked' : 'All Chapters'}</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
      
      <FormattedCampaign
        enrichedCollections={enrichedCollections}
        levelHrefQuery={`chapter=${chapterNumber}`}
        nextHref={getNextChapterHref()}
        nextTitle={getNextChapterTitle()}
        solvedElement={getSolvedElement()}
        solvedLevels={solvedLevels}
        subtitle={config.subtitle}
        title={config.title}
        totalLevels={totalLevels}
      />
    </Page>
  );
}
