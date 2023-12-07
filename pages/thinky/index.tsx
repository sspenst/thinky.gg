import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import { NextSeo } from 'next-seo';
import React from 'react';
import Page from '../../components/page/page';

/* istanbul ignore next */
export default function App() {
  const game = Games[GameId.GLOBAL];

  return (
    <Page title={'Thinky'}>
      <>
        <NextSeo
          title={game.SEOTitle}
          openGraph={{
            title: game.SEOTitle,
            description: game.SEODescription,
            images: [
              {
                url: 'https://' + game.baseUrl + '/logo.png',
                width: 128,
                height: 128,
                alt: game.displayName + ' Logo',
                type: 'image/png',
              },
            ],
          }}
        />
        <div className='text-xl font-bold text-center p-4'>
          Thinky home :)
        </div>
      </>
    </Page>
  );
}
