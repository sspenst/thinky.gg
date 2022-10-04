/* istanbul ignore file */

import { GetServerSidePropsContext } from 'next';
import React from 'react';
import Page from '../../components/page';
import SettingsForm from '../../components/settingsForm';
import { getUserFromToken } from '../../lib/withAuth';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token) : null;

  if (!reqUser) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}

export default function Settings() {
  return (
    <Page title={'Settings'}>
      <SettingsForm />
    </Page>
  );
}
