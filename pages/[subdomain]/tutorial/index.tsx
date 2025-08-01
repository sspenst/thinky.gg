/* istanbul ignore file */
import TutorialPathology from '@root/components/home/tutorialPathology';
import TutorialSokopath from '@root/components/home/tutorialSokopath';
import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { GetServerSidePropsContext } from 'next';
import { NextSeo } from 'next-seo';
import { useContext } from 'react';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const gameId = getGameIdFromReq(context.req);

  if (Games[gameId].disableTutorial) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {
      recaptchaPublicKey: process.env.RECAPTCHA_PUBLIC_KEY ?? null,
    },
  };
}

interface TutorialPageProps {
  recaptchaPublicKey: string | null;
}

export default function TutorialPage({ recaptchaPublicKey }: TutorialPageProps) {
  const { game } = useContext(AppContext);

  return (<>
    <NextSeo
      title={'Tutorial - ' + game.displayName}
      canonical={`${game.baseUrl}/tutorial`}
      openGraph={{
        title: 'Tutorial - ' + game.displayName,
        description: 'Learn how to play ' + game.displayName + ' - The sokoban style mind-bending puzzle game',
        type: 'article',
        url: '/tutorial',
      }}
    />
    {game.id === GameId.SOKOPATH ? <TutorialSokopath recaptchaPublicKey={recaptchaPublicKey} /> : <TutorialPathology recaptchaPublicKey={recaptchaPublicKey} />}
  </>);
}
