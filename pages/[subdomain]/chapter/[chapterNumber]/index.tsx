import UpsellFullAccount from '@root/components/home/upsellFullAccount';
import PlayerRankProgress from '@root/components/progress/playerRankProgress';
import AchievementCategory from '@root/constants/achievements/achievementCategory';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { refreshAchievements } from '@root/helpers/refreshAchievements';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import FormattedCampaign from '../../../../components/formatted/formattedCampaign';
import LinkInfo from '../../../../components/formatted/linkInfo';
import Page from '../../../../components/page/page';
import getCampaignProps, { CampaignProps } from '../../../../helpers/getCampaignProps';
import { getUserFromToken } from '../../../../lib/withAuth';
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

  return {
    props: {
      ...campaignProps.props,
      chapterNumber,
    },
  };
}

export default function ChapterPage({ enrichedCollections, reqUser, solvedLevels, totalLevels, chapterNumber }: ChapterPageProps) {
  const config = chapterConfig[chapterNumber as keyof typeof chapterConfig];
  const chapterUnlocked = reqUser.config?.chapterUnlocked ?? 1;
  
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
      
      {/* Show progress visualization for new users on their first chapter */}
      {chapterNumber === 1 && (reqUser.config?.calcLevelsSolvedCount ?? 0) < 5 && (
        <div className="mb-6">
          <PlayerRankProgress />
        </div>
      )}
      
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