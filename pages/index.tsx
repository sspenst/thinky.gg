/* eslint-disable @next/next/no-html-link-for-pages */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Page from '../components/page';
import User from '../models/data/pathology/user';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User>();

  useEffect(() => {
    fetch('/api/user', { credentials: 'include' }).then(async function(res) {
      setLoading(false);
      if (res.status === 200) {
        setUser(await res.json());
      }
    }).catch(err => {
      console.error(err);
    });
  }, []);

  function logOut() {
    fetch('/api/logout', {
      method: 'POST',
    }).then(() => {
      setUser(undefined);
    });
  }

  return (
    <Page title={'Pathology'}>
      <>
        <div><Link href='/catalog'>CATALOG</Link></div>
        <div><a href='/leaderboard'>LEADERBOARD</a></div>
        {loading ? null : !user ?
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
