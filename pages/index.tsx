import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Page from '../components/page';
import { useRouter } from 'next/router';
import User from '../models/data/pathology/user';

export default function App() {
  const router = useRouter();
  const [user, setUser] = useState<User>();

  useEffect(() => {
    async function getUser() {
      fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'user', {credentials: 'include'}).then(async function(res) {
        if (res.status === 200) {
          setUser(await res.json());
        } else {
          console.log(res);
        }
      }).catch(err => {
        console.error(err);
      });
    }

    getUser();
  }, []);

  function logOut() {
    fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'logout', {credentials: 'include'}).then(() => {
      setUser(undefined);
      router.push('/login');
    });
  }

  return (
    <Page needsAuth={true} title={'Pathology'}>
      <>
        <div><Link href='/catalog'>CATALOG</Link></div>
        <div><Link href='/leaderboard'>LEADERBOARD</Link></div>
        <div>
          You are logged in as <span className='italic font-semibold'>{!user ? '' : user.name}</span>
          <br/>
          <button onClick={logOut}>LOG OUT</button>
        </div>
      </>
    </Page>
  );
}
