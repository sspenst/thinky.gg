/* istanbul ignore file */
import FormattedUser from '@root/components/formatted/formattedUser';
import { ThinkyHomePageLoggedIn } from '@root/components/home/ThinkyLoggedIn';
import ThinkyHomePageNotLoggedIn from '@root/components/home/ThinkyNotLoggedIn';
import Page from '@root/components/page/page';
import Dimensions from '@root/constants/dimensions';
import dbConnect from '@root/lib/dbConnect';
import { getUserFromToken } from '@root/lib/withAuth';
import { ReqUser } from '@root/models/db/user';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { NextSeo, SoftwareAppJsonLd } from 'next-seo';
import React from 'react';

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
  return (
    <>
      <NextSeo
        title={'Thinky - Play Thinky Puzzle Games Like Pathology and Sokopath'}
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
      <Page
        style={user ? {} : {
          backgroundImage: 'url(https://i.imgur.com/iYIoTCx.png)',
          backgroundPosition: 'center',
          backgroundPositionY: 'calc(50% + ' + Dimensions.MenuHeight + 'px)',
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed',
          backgroundRepeat: 'no-repeat',
        }}
        title='Thinky Puzzle Games'
      >
        <div className='flex flex-col justify-center items-center my-10 mx-6 gap-8'>
          <span
            className='text-6xl sm:text-8xl text-white rounded-lg text-center'
            style={{
              textShadow: '0 0 10px rgba(255,255,255,1)',
            }}
          >
          Thinky.gg
          </span>
          {user ?
            <div>
              <ThinkyHomePageLoggedIn user={user} />
            </div>
            : <ThinkyHomePageNotLoggedIn />
          }
        </div>
      </Page>
    </>
  );
}
