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
import { useFeatureFlagVariantKey } from 'posthog-js/react';
import { useEffect } from 'react';

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
  const variant = useFeatureFlagVariantKey('new-home-page-experiment-v2');

  const featureFlagStillLoading = variant === undefined;

  // Track feature flag exposure explicitly
  useEffect(() => {
    if (!user) {
      // Only track for non-logged-in users since that's who sees the A/B test
      posthog.capture('homepage_ab_test_exposure', {
        feature_flag: 'new-homepage-landing',
        variant: variant ? 'test' : 'control',
        user_logged_in: false,
      });
    }
  }, [variant, user]);

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
            // if featureFlagStillLoading, show a loading spinner
            featureFlagStillLoading ? (
              <div className='flex justify-center items-center h-32'>
                <svg className='animate-spin h-8 w-8 text-gray-400' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'>
                  <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' strokeLinecap='round' strokeDasharray='60' strokeDashoffset='20' />
                </svg>
              </div>
            ) : variant === 'test' ? <ThinkyHomePageNotLoggedInVariant /> : <ThinkyHomePageNotLoggedIn />
          )}
        </div>
      </Page>
    </>
  );
}
