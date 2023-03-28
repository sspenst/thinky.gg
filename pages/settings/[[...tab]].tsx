import classNames from 'classnames';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Image from 'next/image';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import Page from '../../components/page';
import SettingsAccount from '../../components/settings/settingsAccount';
import SettingsDanger from '../../components/settings/settingsDanger';
import SettingsGeneral from '../../components/settings/settingsGeneral';
import SettingsPro from '../../components/settings/settingsPro';
import { getUserFromToken } from '../../lib/withAuth';

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
      onClick={() => router.push(`/settings${value !== 'general' ? `/${value}` : ''}`, undefined, { shallow: true })}
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

  let tab = 'general';

  if (tabArray) {
    if (tabArray.length !== 1) {
      return { notFound: true };
    }

    tab = tabArray[0];
  }

  if (!['general', 'proaccount', 'account', 'danger'].includes(tab)) {
    return { notFound: true };
  }

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return {
    props: {
      stripePaymentLink: process.env.STRIPE_PAYMENT_LINK,
    },
  };
}

interface SettingsProps {
  stripePaymentLink: string;
}

/* istanbul ignore next */
export default function Settings({ stripePaymentLink }: SettingsProps) {
  function getQueryTab(tab: string | string[] | undefined) {
    if (!tab) {
      return 'general';
    } else {
      return tab[0];
    }
  }

  const router = useRouter();
  const [tab, setTab] = useState(getQueryTab(router.query.tab));

  useEffect(() => {
    setTab(getQueryTab(router.query.tab));
  }, [router.query.tab]);

  function getTabContent() {
    switch (tab) {
    case 'account':
      return <SettingsAccount />;
    case 'proaccount':
      return <SettingsPro stripePaymentLink={stripePaymentLink} />;
    case 'danger':
      return <SettingsDanger />;
    default:
      return <SettingsGeneral />;
    }
  }

  return (
    <Page title='Settings'>
      <div className='m-4 gap-6 flex flex-col'>
        <div className='flex flex-wrap text-sm text-center gap-2 justify-center'>
          <Tab
            activeTab={tab}
            label='General'
            value='general'
          />
          <Tab
            activeTab={tab}
            label='Account'
            value='account'
          />
          <Tab
            activeTab={tab}
            label={
              <div className='flex flex-row items-center gap-2'>
                <Image alt='pro' src='/pro.svg' width='16' height='16' />
                <span>Pathology Pro</span>
              </div>
            }
            value='proaccount'
          />
          <Tab
            activeTab={tab}
            className='border border-red-500'
            label='Danger Zone'
            value='danger'
          />
        </div>
        <div>
          {getTabContent()}
        </div>
      </div>
    </Page>
  );
}
