import React, { useEffect } from 'react';
import AccountForm from '../../components/accountForm';
import Page from '../../components/page';
import { useRouter } from 'next/router';
import useUser from '../../hooks/useUser';

export default function Account() {
  const { error, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (error) {
      router.replace('/login');
    }
  }, [error, router]);

  return (error || isLoading ? null :
    <Page title={'Account'}>
      <AccountForm/>
    </Page>
  );
}
