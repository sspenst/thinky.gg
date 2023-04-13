import { AppContext } from '@root/contexts/appContext';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React, { useContext, useEffect, useRef, useState } from 'react';
import Joyride from 'react-joyride';
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
  const { user } = useContext(AppContext);
  const joyrideRef = useRef<any>();
  const stepsData = {
    steps: [
      {
        disableBeacon: true,
        target: '#chapter1',
        content: 'Welcome to Pathology main campaign! This is the first chapter, and it is unlocked by default.',
      },
      {
        target: '#chapter2',
        content: 'Complete the first chapter to unlock Chapter 2!',
      },

    ]
  };
  const [steps, setSteps] = useState(stepsData.steps);
  const [run, setRun] = useState(true);
  const chapterUnlocked = reqUser.chapterUnlocked ?? 1;
  const [tour, setTour] = useState<JSX.Element>();

  useEffect(() => {
    if (user && user.score === 0) {
      setTour(<Joyride

        ref={joyrideRef}
        run={run}
        steps={steps}
        continuous
        hideCloseButton

        scrollToFirstStep
        showProgress
        showSkipButton

      />);
    }
  }, [run, steps, user]);

  return (
    <Page title={'Chapter Select'}>
      <div className='flex flex-col items-center gap-8 p-4'>
        {tour}
        <div id='title' className='font-bold text-3xl text-center'>
          Pathology Official Campaign
        </div>
        <ChapterSelectCard id='chapter1'
          href={'/chapter1'}
          levelData={'00000000\n00000000\n00000000\n00000000'}
          subtitle={'Grassroots'}
          title={'Chapter 1'}
        />
        <ChapterSelectCard id='chapter2'
          disabled={chapterUnlocked < 2}
          disabledStr={'Complete Chapter 1 to unlock Chapter 2!'}
          href={'/chapter2'}
          levelData={'005E0C00\n0G070005\n10005010\n005100I0'}
          subtitle={'Into the Depths'}
          title={'Chapter 2'}
        />
        <ChapterSelectCard id='chapter3'
          disabled={chapterUnlocked < 3}
          disabledStr={'Complete Chapter 2 to unlock Chapter 3!'}
          href={'/chapter3'}
          levelData={'B519F0G0\n10JH5H52\n75F02J08\n02050B10'}
          subtitle={'Brain Busters'}
          title={'Chapter 3'}
        />

      </div>
    </Page>
  );
}
