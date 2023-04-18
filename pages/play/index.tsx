import PagePath from '@root/constants/pagePath';
import { useTour } from '@root/hooks/useTour';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import React, { useCallback } from 'react';
import { CallBackProps } from 'react-joyride';
import ChapterSelectCard from '../../components/chapterSelectCard';
import Page from '../../components/page';
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
  const chapterUnlocked = reqUser.chapterUnlocked ?? 1;
  const router = useRouter();
  const memoizedCallback = useCallback((data: CallBackProps) => {
    if (data.action === 'next' && data.index === 0) {
      router.push('/chapter1');
    }
  }, [router]); // Add any dependencies required by the callback function inside the dependency array

  const tour = useTour(PagePath.PLAY, memoizedCallback);

  return (
    <Page title={'Chapter Select'}>
      <>
        {tour}
        <div className='flex flex-col items-center gap-8 p-4'>
          <div className='font-bold text-3xl text-center' id='title'>
            Pathology Official Campaign
          </div>
          <ChapterSelectCard
            href={'/chapter1'}
            id='chapter1'
            levelData={'00000000\n00000000\n00000000\n00000000'}
            subtitle={'Grassroots'}
            title={'Chapter 1'}
          />
          <ChapterSelectCard
            disabled={chapterUnlocked < 2}
            disabledStr={'Complete Chapter 1 to unlock Chapter 2!'}
            href={'/chapter2'}
            id='chapter2'
            levelData={'005E0C00\n0G070005\n10005010\n005100I0'}
            subtitle={'Into the Depths'}
            title={'Chapter 2'}
          />
          <ChapterSelectCard
            disabled={chapterUnlocked < 3}
            disabledStr={'Complete Chapter 2 to unlock Chapter 3!'}
            href={'/chapter3'}
            id='chapter3'
            levelData={'B519F0G0\n10JH5H52\n75F02J08\n02050B10'}
            subtitle={'Brain Busters'}
            title={'Chapter 3'}
          />
        </div>
      </>
    </Page>
  );
}
