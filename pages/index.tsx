/* istanbul ignore file */
import { ThinkyHomePageLoggedIn } from '@root/components/home/thinkyLoggedIn';
import ThinkyHomePageNotLoggedInVariant from '@root/components/home/thinkyNotLoggedInVariant';
import Page from '@root/components/page/page';
import dbConnect from '@root/lib/dbConnect';
import { getUserFromToken } from '@root/lib/withAuth';
import User, { ReqUser } from '@root/models/db/user';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import dynamic from 'next/dynamic';
import { NextSeo, SoftwareAppJsonLd } from 'next-seo';
import { useEffect, useState } from 'react';

const MathematicalBackground = dynamic(
  () => import('@root/components/backgrounds/MathematicalBackground'),
  { ssr: false, loading: () => null }
);

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  let reqUser: User | null = null;

  if (token) {
    await dbConnect();
    reqUser = await getUserFromToken(token, context.req as NextApiRequest);
  } else {
    reqUser = null;
  }

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
  const [showBg, setShowBg] = useState(false);

  useEffect(() => {
    if (!user) {
      document.body.classList.add('mathematical-background-active');
    }

    return () => {
      document.body.classList.remove('mathematical-background-active');
    };
  }, [user]);

  useEffect(() => {
    if (user) return;

    const prefersReduced = typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const isMobile = typeof window !== 'undefined' &&
      (window.innerWidth < 768 || window.devicePixelRatio > 2);

    if (prefersReduced || isMobile) {
      setShowBg(false);

      return;
    }

    let idleId: number | null = null;
    let timeoutId: number | null = null;

    const onIdle = () => setShowBg(true);

    type RequestIdle = (cb: () => void) => number;
    type CancelIdle = (id: number) => void;

    const ric = (window as unknown as { requestIdleCallback?: RequestIdle }).requestIdleCallback;
    const cic = (window as unknown as { cancelIdleCallback?: CancelIdle }).cancelIdleCallback;

    if (typeof ric === 'function') {
      idleId = ric(onIdle);
    } else {
      timeoutId = window.setTimeout(onIdle, 800);
    }

    return () => {
      if (idleId !== null && typeof cic === 'function') {
        cic(idleId);
      }

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
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
      {!user && showBg && <MathematicalBackground />}
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
            // Show loading spinner only for first 2 seconds, then fallback to test
            <ThinkyHomePageNotLoggedInVariant />
          )}
        </div>
      </Page>
    </>
  );
}
