import React, { useEffect } from 'react';
import Page from '../../components/page';
import { useRouter } from 'next/router';
import useStats from '../../hooks/useStats';
import useUser from '../../hooks/useUser';

export default function Account() {
  const { mutateStats } = useStats();
  const { error, isLoading, mutateUser } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (error) {
      router.replace('/login');
    }
  }, [error, router]);

  function deleteAccount() {
    if (confirm('Are you sure you want to delete your account?')) {
      fetch('/api/user', {
        method: 'DELETE',
      }).then(() => {
        mutateStats(undefined);
        mutateUser(undefined);
        router.push('/');
      });
    }
  }

  return (error || isLoading ? null :
    <Page title={'Account'}>
      <>
        <div><button onClick={deleteAccount}>DELETE ACCOUNT</button></div>
      </>
    </Page>
  );
}