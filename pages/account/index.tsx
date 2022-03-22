import React, { useEffect, useState } from 'react';
import Page from '../../components/page';
import { useRouter } from 'next/router';
import { useSWRConfig } from 'swr';
import useUser from '../../components/useUser';

export default function Account() {
  const [loading, setLoading] = useState(true);
  const { mutate } = useSWRConfig();
  const router = useRouter();
  const [theme, setTheme] = useState<string>();
  const { user } = useUser();

  useEffect(() => {
    setTheme(document.body.className);
  }, []);

  useEffect(() => {
    fetch('/api/checkToken', { credentials: 'include' }).then(res => {
      if (res.status === 200) {
        setLoading(false);
      } else {
        router.replace('/login');
      }
    }).catch(err => {
      console.error(err);
      router.replace('/login');
    });
  }, [router]);

  function logOut() {
    fetch('/api/logout', {
      method: 'POST',
    }).then(() => {
      mutate('/api/user', undefined);
      router.push('/');
    });
  }

  function deleteAccount() {
    if (confirm('Are you sure you want to delete your account?')) {
      fetch('/api/user', {
        method: 'DELETE',
      }).then(() => {
        mutate('/api/user', undefined);
        router.push('/');
      });
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTheme = e.currentTarget.value;
    document.body.className = newTheme;
    setTheme(newTheme);
  }

  return (loading || !user ? null :
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