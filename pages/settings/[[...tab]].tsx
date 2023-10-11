import SettingsAccountGuest from '@root/components/settings/settingsAccountGuest';
import SettingsNotifications from '@root/components/settings/settingsNotifications';
import isGuest from '@root/helpers/isGuest';
import User from '@root/models/db/user';
import UserConfig from '@root/models/db/userConfig';
import classNames from 'classnames';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Image from 'next/image';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import Page from '../../components/page/page';
import SettingsAccount from '../../components/settings/settingsAccount';
import SettingsDanger from '../../components/settings/settingsDanger';
import SettingsGeneral from '../../components/settings/settingsGeneral';
import SettingsPro from '../../components/settings/settingsPro';
import { getUserFromToken } from '../../lib/withAuth';
import { getUserConfig } from '../api/user-config';

enum SettingsTab {
  Account = 'account',
  Danger = 'danger',
  General = 'general',
  Pro = 'pro',
  Notifications = 'notifications',
}

interface TabProps {
  activeTab: string;
  className?: string;
  label: string | JSX.Element;
  value: string;
}

/* istanbul ignore next */
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

  if (tab === SettingsTab.Account || tab === SettingsTab.Notifications) {
    userConfig = await getUserConfig(reqUser._id);
  }

  return {
    props: {
      stripeCustomerPortalLink: process.env.STRIPE_CUSTOMER_PORTAL,
      stripePaymentLink: process.env.STRIPE_PAYMENT_LINK,
      stripePaymentYearlyLink: process.env.STRIPE_PAYMENT_LINK_YEARLY,
      stripePaymentLinkGift: process.env.STRIPE_PAYMENT_LINK_GIFT,
      user: JSON.parse(JSON.stringify(reqUser)),
      userConfig: JSON.parse(JSON.stringify(userConfig)),
    },
  };
}

interface SettingsProps {
  stripeCustomerPortalLink: string;
  stripePaymentLink: string;
  stripePaymentYearlyLink: string;
  stripePaymentLinkGift: string;
  user: User;
  userConfig: UserConfig | null;
}

/* istanbul ignore next */
export default function Settings({
  stripeCustomerPortalLink,
  stripePaymentLink,
  stripePaymentYearlyLink,
  stripePaymentLinkGift,
  user,
  userConfig,
}: SettingsProps) {
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
      return !isGuest(user) ? <SettingsAccount user={user} userConfig={userConfig} /> : <SettingsAccountGuest />;
    case SettingsTab.Pro:
      return <SettingsPro stripeCustomerPortalLink={stripeCustomerPortalLink} stripePaymentLink={stripePaymentLink} stripePaymentYearlyLink={stripePaymentYearlyLink} stripePaymentLinkGift={stripePaymentLinkGift} />;
    case SettingsTab.Danger:
      return <SettingsDanger />;
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
                <span>Pathology Pro</span>
              </div>
            }
            value={SettingsTab.Pro}
          />
          <Tab
            activeTab={tab}
            className='border border-red-500'
            label='Danger Zone'
            value={SettingsTab.Danger}
          />
        </div>
        <div>
          {getTabContent()}
        </div>
      </div>
    </Page>
  );
}
