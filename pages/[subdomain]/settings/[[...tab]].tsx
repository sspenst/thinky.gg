import SettingsAccount from '@root/components/settings/settingsAccount';
import SettingsNotifications from '@root/components/settings/settingsNotifications';
import { AppContext } from '@root/contexts/appContext';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import User from '@root/models/db/user';
import UserConfig from '@root/models/db/userConfig';
import classNames from 'classnames';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Image from 'next/image';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';
import Page from '../../../components/page/page';
import SettingsGeneral from '../../../components/settings/settingsGeneral';
import SettingsPro from '../../../components/settings/settingsPro';
import { getUserFromToken } from '../../../lib/withAuth';
import { getUserConfig } from '../../api/user-config';

enum SettingsTab {
  Account = 'account',
  General = 'general',
  Pro = 'pro',
  Notifications = 'notifications',
}

interface TabProps {
  activeTab: string;
  className?: string;
  label: React.ReactNode;
  value: string;
}

/* istanbul ignore next 
// Newline placeholder needed for swc: https://github.com/swc-project/jest/issues/119#issuecomment-1872581999
*/
function Tab({ activeTab, className, label, value }: TabProps) {
  const router = useRouter();

  return (
    <button
      className={classNames(
        'inline-block p-2 rounded-lg',
        activeTab == value ? 'tab-active font-bold' : 'tab',
        className,
      )}
      onClick={() => router.push(`/settings${value !== 'general' ? `/${value}` : ''}`)}
    >
      {label}
    </button>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  if (!context.params) {
    return { notFound: true };
  }

  const tabArray = context.params.tab;

  let tab = SettingsTab.General;

  if (tabArray) {
    if (tabArray.length !== 1) {
      return { notFound: true };
    }

    tab = tabArray[0] as SettingsTab;
  }

  if (!Object.values(SettingsTab).includes(tab)) {
    return { notFound: true };
  }

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

  let userConfig: UserConfig | null = null;
  const gameId = getGameIdFromReq(context.req);

  if (tab === SettingsTab.Account || tab === SettingsTab.Notifications) {
    userConfig = await getUserConfig(gameId, reqUser);
  }

  return {
    props: {
      stripeCustomerPortalLink: process.env.STRIPE_CUSTOMER_PORTAL,
      stripePaymentLink: process.env.STRIPE_PAYMENT_LINK,
      stripePaymentYearlyLink: process.env.STRIPE_PAYMENT_LINK_YEARLY,
      user: JSON.parse(JSON.stringify(reqUser)),
      userConfig: JSON.parse(JSON.stringify(userConfig)),
    },
  };
}

interface SettingsProps {
  stripeCustomerPortalLink: string;
  stripePaymentLink: string;
  stripePaymentYearlyLink: string;
  user: User;
  userConfig: UserConfig | null;
}

/* istanbul ignore next 
// Newline placeholder needed for swc: https://github.com/swc-project/jest/issues/119#issuecomment-1872581999
*/
export default function Settings({
  stripeCustomerPortalLink,
  stripePaymentLink,
  stripePaymentYearlyLink,
  user,
  userConfig,
}: SettingsProps) {
  const { game } = useContext(AppContext);

  function getQueryTab(tab: string | string[] | undefined) {
    if (!tab) {
      return SettingsTab.General;
    } else {
      return tab[0] as SettingsTab;
    }
  }

  const router = useRouter();
  const [tab, setTab] = useState(getQueryTab(router.query.tab));

  useEffect(() => {
    setTab(getQueryTab(router.query.tab));
  }, [router.query.tab]);

  function getTabContent() {
    switch (tab) {
    case SettingsTab.Account:
      return <SettingsAccount user={user} userConfig={userConfig} />;
    case SettingsTab.Pro:
      return <SettingsPro stripeCustomerPortalLink={stripeCustomerPortalLink} stripePaymentLink={stripePaymentLink} stripePaymentYearlyLink={stripePaymentYearlyLink} />;
    case SettingsTab.Notifications:
      return <SettingsNotifications />;
    default:
      return <SettingsGeneral user={user} />;
    }
  }

  return (
    <Page title='Settings'>
      <div className='m-4 gap-6 flex flex-col'>
        <div className='flex flex-wrap text-sm text-center gap-2 justify-center'>
          <Tab
            activeTab={tab}
            label='General'
            value={SettingsTab.General}
          />
          <Tab
            activeTab={tab}
            label='Account'
            value={SettingsTab.Account}
          />
          <Tab
            activeTab={tab}
            label='Notifications'
            value={SettingsTab.Notifications}
          />
          <Tab
            activeTab={tab}
            label={
              <div className='flex flex-row items-center gap-2'>
                <Image alt='pro' src='/pro.svg' width='16' height='16' />
                <span>{game.displayName} Pro</span>
              </div>
            }
            value={SettingsTab.Pro}
          />
        </div>
        <div>
          {getTabContent()}
        </div>
      </div>
    </Page>
  );
}
