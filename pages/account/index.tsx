import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/appContext';
import Page from '../../components/page';
import { useRouter } from 'next/router';
import useStats from '../../hooks/useStats';
import useUser from '../../hooks/useUser';

export default function Account() {
  const [email, setEmail] = useState<string>();
  const { mutateStats } = useStats();
  const [name, setName] = useState<string>();
  const { error, isLoading, mutateUser, user } = useUser();
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);

  useEffect(() => {
    setEmail(user?.email);
    setName(user?.name);
  }, [user]); 

  useEffect(() => {
    if (error) {
      router.replace('/login');
    }
  }, [error, router]);

  function updateName(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setIsLoading(true);

    fetch('/api/user', {
      method: 'PUT',
      body: JSON.stringify({
        name: name,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(async res => {
      const { updated } = await res.json();

      if (!updated) {
        alert('Error: username already exists');
      }

      mutateUser();
    });
  }

  function updateEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setIsLoading(true);

    fetch('/api/user', {
      method: 'PUT',
      body: JSON.stringify({
        email: email,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(async res => {
      const { updated } = await res.json();

      if (!updated) {
        alert('Error: email already exists');
      }

      mutateUser();
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

  return (error || isLoading ? null :
    <Page title={'Account'}>
      <>
        <form onSubmit={updateName}>
          <label htmlFor='name'>Username:</label>
          <br/>
          <input
            type='text'
            name='name'
            placeholder='Enter username'
            value={name}
            onChange={e => setName(e.target.value)}
            style={{color: 'rgb(0, 0, 0)'}}
            required
          />
          <br/>
          <input className='cursor-pointer underline' type='submit' value='Update'></input>
        </form>
        <br/>
        <form onSubmit={updateEmail}>
          <label htmlFor='email'>Email:</label>
          <br/>
          <input
            type='email'
            name='email'
            placeholder='Enter email'
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{color: 'rgb(0, 0, 0)'}}
            required
          />
          <br/>
          <input className='cursor-pointer underline' type='submit' value='Update'></input>
        </form>
        <br/>
        <div><button onClick={deleteAccount}>DELETE ACCOUNT</button></div>
      </>
    </Page>
  );
}