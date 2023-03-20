import classNames from 'classnames';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';
import Page from '../../components/page';
import SettingsForm from '../../components/settingsForm';
import UploadImage from '../../components/uploadImage';
import { AppContext } from '../../contexts/appContext';
import redirectToLogin from '../../helpers/redirectToLogin';
import styles from '../../pages/profile/[name]/[[...tab]]/ProfilePage.module.css';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return await redirectToLogin(context);
}

/* istanbul ignore next */
export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const { forceUpdate, mutateUser, setShouldAttemptAuth } = useContext(AppContext);
  const router = useRouter();

  function Tab({ label, value, activeTab, setActiveTab }: { label: string, value: string, activeTab: string, setActiveTab: (value: string) => void }) {
    const cls = classNames(
      'inline-block p-2 rounded-lg',
      activeTab == value ? [styles['tab-active'], 'font-bold'] : styles.tab,
    );

    return (
      <button
        className={cls}
        onClick={() => {
          setActiveTab(value);
          router.push(`/settings?tab=${value}`, undefined, { shallow: true });
        }
        }

      >
        {label}
      </button>
    );
  }

  function TabContent({ value, activeTab, children }: { value: string, activeTab: string, children: JSX.Element }) {
    return activeTab === value ? <div className='p-4'>{children}</div> : null;
  }

  function deleteAccount() {
    if (prompt('Are you sure you want to delete your account? Type DELETE to confirm.') === 'DELETE') {
      fetch('/api/user', {
        method: 'DELETE',
      }).then(() => {
        localStorage.clear();
        sessionStorage.clear();
        mutateUser(undefined);
        setShouldAttemptAuth(false);
        router.push('/');
        forceUpdate();
      });
    }
  }

  // Set the initial active tab based on the query string parameter
  useEffect(() => {
    const queryTab = router.query.tab as string;

    setActiveTab(queryTab || 'general');
  }, [router.query.tab]);
  // ...rest of the states and functions

  return (
    <Page title='Settings'>
      <div>
        <div className='flex flex-wrap text-sm text-center gap-2 mt-2 justify-center'>
          <Tab
            label='General'
            value='general'
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <Tab
            label='Account'
            value='account'
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <Tab
            label='Danger Zone'
            value='danger'
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>
        <TabContent value='general' activeTab={activeTab}>

          <div className='flex flex-col gap-3 '>
            <UploadImage />

          </div>

        </TabContent>
        <TabContent value='account' activeTab={activeTab}>

          <SettingsForm />

        </TabContent>
        <TabContent value='danger' activeTab={activeTab}>
          <div className='flex flex-col gap-4 justify-center items-center'>
            <div className='font-bold'>
          Danger Zone
            </div>
            <button onClick={deleteAccount} className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-fit' type='button'>
          Delete Account
            </button>
              This can not be undone!
          </div>
        </TabContent>
      </div>
    </Page>
  );
}
