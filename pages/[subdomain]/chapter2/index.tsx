import UpsellFullAccount from '@root/components/home/upsellFullAccount';
import AchievementCategory from '@root/constants/achievements/achievementCategory';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { refreshAchievements } from '@root/helpers/refreshAchievements';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import FormattedCampaign from '../../../components/formatted/formattedCampaign';
import LinkInfo from '../../../components/formatted/linkInfo';
import Page from '../../../components/page/page';
import getCampaignProps, { CampaignProps } from '../../../helpers/getCampaignProps';
import { getUserFromToken } from '../../../lib/withAuth';
import { UserConfigModel } from '../../../models/mongoose';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const gameId = getGameIdFromReq(context.req);

  if (!reqUser) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const chapterUnlocked = reqUser.config?.chapterUnlocked ?? 1;

  if (chapterUnlocked === 1) {
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
  }

  return await getCampaignProps(gameId, reqUser, 'chapter2');
}

/* istanbul ignore next */
export default function Chapter2Page({ enrichedCollections, reqUser, solvedLevels, totalLevels }: CampaignProps) {
  return (
    <Page folders={[new LinkInfo('Play', '/play')]} title={'Chapter 2'}>
      <UpsellFullAccount user={reqUser} />
      <FormattedCampaign
        enrichedCollections={enrichedCollections}
        levelHrefQuery={'chapter=2'}
        nextHref={'/chapter3'}
        nextTitle={(reqUser.config?.chapterUnlocked ?? 1) < 3 ? 'Unlock Chapter 3' : undefined}
        solvedElement={
          <div className='flex flex-col items-center justify-center text-center mt-2 bg-2 border-color-3 border p-3 m-3 rounded-lg'>
            <div className='text-xl'>
              Congratulations!
              <br /><br />
              You&apos;ve solved every level in Chapter 2.
              <br /><br />
              Try out <Link className='font-bold underline text-blue-500' href='/chapter3' passHref>Chapter 3</Link> next!
            </div>
          </div>
        }
        solvedLevels={solvedLevels}
        subtitle={'Into the Depths'}
        title={'Chapter 2'}
        totalLevels={totalLevels}
      />
    </Page>
  );
}
