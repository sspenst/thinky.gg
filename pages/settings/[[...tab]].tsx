import classNames from 'classnames';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import Page from '../../components/page';
import ProAccountForm from '../../components/pro-account/pro-account-form';
import SettingsAccount from '../../components/settings/settingsAccount';
import SettingsDanger from '../../components/settings/settingsDanger';
import SettingsGeneral from '../../components/settings/settingsGeneral';
import { getUserFromToken } from '../../lib/withAuth';

const stripePaymentLink = process.env.STRIPE_PAYMENT_LINK;

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
      stripePaymentLink: stripePaymentLink,
    },
  };
}

interface TabProps {
  activeTab: string;
  className?: string;
  label: string;
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

/* istanbul ignore next */
export default function Settings({ stripePaymentLink }: {stripePaymentLink: string}) {
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
      return <ProAccountForm stripePaymentLink={stripePaymentLink} />;
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
            label='Pro Account'
            value='proaccount'
            activeTab={tab}
          />
          <Tab
            activeTab={tab}
            label='Account'
            value='account'
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
