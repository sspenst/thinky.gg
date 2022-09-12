/* istanbul ignore file */

import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import Page from '../../components/page';
import SettingsForm from '../../components/settingsForm';
import useUser from '../../hooks/useUser';

export default function Settings() {
  const { error, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (error) {
      router.replace('/login');
    }
  }, [error, router]);

  return (error || isLoading ? null :
    <Page title={'Settings'}>
      <SettingsForm />
    </Page>
  );
}
