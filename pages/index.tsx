/* istanbul ignore file */
import MathematicalBackground from '@root/components/backgrounds/MathematicalBackground';
import { ThinkyHomePageLoggedIn } from '@root/components/home/thinkyLoggedIn';
import ThinkyHomePageNotLoggedIn from '@root/components/home/thinkyNotLoggedIn';
import ThinkyHomePageNotLoggedInVariant from '@root/components/home/thinkyNotLoggedInVariant';
import Page from '@root/components/page/page';
import dbConnect from '@root/lib/dbConnect';
import { getUserFromToken } from '@root/lib/withAuth';
import { ReqUser } from '@root/models/db/user';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { NextSeo, SoftwareAppJsonLd } from 'next-seo';
import posthog from 'posthog-js';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import React, { useEffect } from 'react';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  return {
    props: {
      user: JSON.parse(JSON.stringify(reqUser)),
    },
  };
}

interface ThinkyHomeRouterProps {
  user: ReqUser | null;
}

export default function ThinkyHomeRouter({ user }: ThinkyHomeRouterProps) {
  // Feature flag for homepage A/B test
  const isNewHomepageLanding = useFeatureFlagEnabled('new-homepage-landing');

  // Track feature flag exposure explicitly
  useEffect(() => {
    if (!user) {
      // Only track for non-logged-in users since that's who sees the A/B test
      posthog.capture('homepage_ab_test_exposure', {
        feature_flag: 'new-homepage-landing',
        variant: isNewHomepageLanding ? 'test' : 'control',
        user_logged_in: false,
      });
    }
  }, [isNewHomepageLanding, user]);

  useEffect(() => {
    if (!user) {
      document.body.classList.add('mathematical-background-active');
    }

    return () => {
      document.body.classList.remove('mathematical-background-active');
    };
  }, [user]);

  return (
    <>
      <NextSeo
        title={'Thinky Puzzle Games Free Browser Puzzle Platform & Level Editor'}
        description='Thinky is a platform dedicated to high-quality puzzle games. Solve and optimize puzzles, search thousands of levels, or create your own for everyone to play!'
        canonical={'https://thinky.gg'}
        openGraph={{
          title: 'Thinky - Play Thinky Puzzle Games Like Pathology and Sokopath',
          description: 'Thinky is a platform dedicated to high-quality puzzle games. Solve and optimize puzzles, search thousands of levels, or create your own for everyone to play!',
          type: 'website',
          url: 'https://thinky.gg',
        }}
      />
      <SoftwareAppJsonLd
        name='Thinky'
        price='0'
        priceCurrency='USD'
        applicationCategory='Game'
      />
      {!user && <MathematicalBackground />}
      <Page
        style={user ? {} : {
          position: 'relative',
          backgroundColor: 'transparent',
        }}
        title='Thinky Puzzle Games'
      >
        <div className='flex flex-col justify-center items-center my-10 mx-6 gap-6 md:gap-0'>
          <span
            className='text-6xl sm:text-8xl text-white rounded-lg text-center'
            style={{
              textShadow: '0 0 10px rgba(255,255,255,1)',
            }}
          >
          Thinky.gg
          </span>
          {user ? (
            <div>
              <ThinkyHomePageLoggedIn user={user} />
            </div>
          ) : (
            // A/B test: render variant or original based on feature flag
            isNewHomepageLanding ? <ThinkyHomePageNotLoggedInVariant /> : <ThinkyHomePageNotLoggedIn />
          )}
        </div>
      </Page>
    </>
  );
}
