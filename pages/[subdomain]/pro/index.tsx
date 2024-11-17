import { getGameFromId, getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React from 'react';
import Page from '../../../components/page/page';
import SettingsPro from '../../../components/settings/settingsPro';
import { getUserFromToken } from '../../../lib/withAuth';
import { GameId } from '@root/constants/GameId';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    return {
      redirect: {
        destination: '/login' + (context.resolvedUrl ? '?redirect=' + encodeURIComponent(context.resolvedUrl) : ''),
        permanent: false,
      },
    };
  }

  const gameId = getGameIdFromReq(context.req);
  const game = getGameFromId(gameId);

  if (game.id !== GameId.THINKY) {
    return {
      redirect: {
        // redirect to thinky's pro page
        destination: getGameFromId(GameId.THINKY).baseUrl + '/pro',
        permanent: false,
      },
    };
  }

  return {
    props: {
      stripeCustomerPortalLink: process.env.STRIPE_CUSTOMER_PORTAL,
      stripePaymentLink: game.stripePaymentLinkMonthly,
      stripePaymentYearlyLink: game.stripePaymentLinkYearly,
    } as SettingsProps,
  };
}

interface SettingsProps {
  stripeCustomerPortalLink?: string;
  stripePaymentLink?: string;
  stripePaymentYearlyLink?: string;
}

/* istanbul ignore next */
export default function Settings({
  stripeCustomerPortalLink,
  stripePaymentLink,
  stripePaymentYearlyLink,
}: SettingsProps) {
  return (
    <Page title='Settings'>
      <div className='mx-4 my-8 gap-6'>
        <SettingsPro stripeCustomerPortalLink={stripeCustomerPortalLink} stripePaymentLink={stripePaymentLink} stripePaymentYearlyLink={stripePaymentYearlyLink} />
      </div>
    </Page>
  );
}
