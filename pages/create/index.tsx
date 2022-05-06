import React, { useEffect } from 'react';
import Page from '../../components/page';
import WorldTable from '../../components/worldTable';
import { useRouter } from 'next/router';
import useUser from '../../hooks/useUser';

export default function Create() {
  const { isLoading, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [isLoading, router, user]);

  return (
    <Page title={'Create'}>
      <WorldTable/>
    </Page>
  );
}
