/* istanbul ignore file */

import { GetServerSidePropsContext } from 'next';
import React from 'react';
import Page from '../../components/page';
import SettingsForm from '../../components/settingsForm';
import redirectToLogin from '../../helpers/redirectToLogin';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return await redirectToLogin(context);
}

export default function Settings() {
  return (
    <Page title={'Settings'}>
      <SettingsForm />
    </Page>
  );
}
