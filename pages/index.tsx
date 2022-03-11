/* eslint-disable @next/next/no-html-link-for-pages */
import Link from 'next/link';
import Page from '../components/page';
import React from 'react';
import { useSWRConfig } from 'swr';
import useUser from '../components/useUser';

export default function App() {
  const { mutate } = useSWRConfig()
  const { user, isLoading } = useUser();

  function logOut() {
    fetch('/api/logout', {
      method: 'POST',
    }).then(() => {
      mutate('/api/user', undefined);
    });
  }

  return (
    <Page title={'Pathology'}>
      <>
        <div><Link href='/catalog'>CATALOG</Link></div>
        <div><a href='/leaderboard'>LEADERBOARD</a></div>
        {isLoading ? null : !user ?
          <div>
            <div><Link href='/login'>LOG IN</Link></div>
            <div><Link href='/signup'>SIGN UP</Link></div>
          </div> :
          <div>
            You are logged in as <span className='italic font-semibold'>{!user ? '' : user.name}</span>
            <br/>
            <button onClick={logOut}>LOG OUT</button>
          </div>
        }
      </>
    </Page>
  );
}
