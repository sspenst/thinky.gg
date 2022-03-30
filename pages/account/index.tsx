import React, { useEffect, useState } from 'react';
import Page from '../../components/page';
import { useRouter } from 'next/router';
import useStats from '../../hooks/useStats';
import useUser from '../../hooks/useUser';

export default function Account() {
  const { mutateStats } = useStats();
  const { error, isLoading, mutateUser } = useUser();
  const router = useRouter();
  const [theme, setTheme] = useState<string>();

  useEffect(() => {
    setTheme(document.body.className);
  }, []);

  useEffect(() => {
    if (error) {
      router.replace('/login');
    }
  }, [error, router]);

  function logOut() {
    fetch('/api/logout', {
      method: 'POST',
    }).then(() => {
      mutateStats(undefined);
      mutateUser(undefined);
      router.push('/');
    });
  }

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

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTheme = e.currentTarget.value;
    document.body.className = newTheme;
    setTheme(newTheme);
  }

  return (error || isLoading ? null :
    <Page title={'Account'}>
      <>
        THEME:
        <input
          checked={theme === 'theme-classic'}
          name='theme'
          onChange={onChange}
          style={{
            margin: '0px 10px',
          }}
          type='radio'
          value='theme-classic'
        />
        CLASSIC
        <input
          checked={theme === 'theme-lab'}
          name='theme'
          onChange={onChange}
          style={{
            margin: '0px 10px',
          }}
          type='radio'
          value='theme-lab'
        />
        LAB
        <input
          checked={theme === 'theme-light'}
          name='theme'
          onChange={onChange}
          style={{
            margin: '0px 10px',
          }}
          type='radio'
          value='theme-light'
        />
        LIGHT
        <input
          checked={theme === 'theme-modern'}
          name='theme'
          onChange={onChange}
          style={{
            margin: '0px 10px',
          }}
          type='radio'
          value='theme-modern'
        />
        MODERN
        <div><button onClick={logOut}>LOG OUT</button></div>
        <div><button onClick={deleteAccount}>DELETE ACCOUNT</button></div>
      </>
    </Page>
  );
}