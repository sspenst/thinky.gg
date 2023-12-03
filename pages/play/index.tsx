import PagePath from '@root/constants/pagePath';
import { AppContext } from '@root/contexts/appContext';
import { useTour } from '@root/hooks/useTour';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import React, { useCallback, useContext } from 'react';
import { CallBackProps } from 'react-joyride';
import ChapterSelectCard from '../../components/cards/chapterSelectCard';
import Page from '../../components/page/page';
import { getUserFromToken } from '../../lib/withAuth';
import User from '../../models/db/user';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
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
  const router = useRouter();
  const memoizedCallback = useCallback((data: CallBackProps) => {
    if (data.action === 'next' && data.index === 0) {
      router.push('/chapter1');
    }
  }, [router]);

  const tour = useTour(PagePath.PLAY, memoizedCallback);

  return (
    <Page title={'Chapter Select'}>
      <>
        {tour}
        <div className='flex flex-col items-center gap-8 p-4'>
          <div className='font-bold text-3xl text-center' id='title'>
            {game.displayName} Official Campaign
          </div>
          <ChapterSelectCard chapter={1} chapterUnlocked={chapterUnlocked} />
          <ChapterSelectCard chapter={2} chapterUnlocked={chapterUnlocked} />
          <ChapterSelectCard chapter={3} chapterUnlocked={chapterUnlocked} />
          {chapterUnlocked >= 3 && <ChapterSelectCard chapter={4} chapterUnlocked={chapterUnlocked} />}
        </div>
      </>
    </Page>
  );
}
