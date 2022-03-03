import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import User from '../components/DataModels/Pathology/User';

export default function UserState() {
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

  return (<div>
    You are logged in as <span className='italic font-semibold'>{!user ? '' : user.name}</span>
    <br/>
    <button onClick={logOut}>LOG OUT</button>
  </div>);
}
