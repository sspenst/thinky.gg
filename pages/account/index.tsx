import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/appContext';
import Page from '../../components/page';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import useStats from '../../hooks/useStats';
import useUser from '../../hooks/useUser';

export default function Account() {
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const { error, isLoading, mutateUser, user } = useUser();
  const { mutateStats } = useStats();
  const [name, setName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [password2, setPassword2] = useState<string>('');
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setName(user.name);
    }
  }, [user]);

  useEffect(() => {
    if (error) {
      router.replace('/login');
    }
  }, [error, router]);

  function updateUser(
    body: string,
    property: string,
  ) {
    toast.loading(`Updating ${property}...`);
    setIsLoading(true);

    fetch('/api/user', {
      method: 'PUT',
      body: body,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(async res => {
      const { updated } = await res.json();

      if (!updated) {
        toast.dismiss();
        toast.error(`Error updating ${property}`);
      } else {
        toast.dismiss();
        toast.success(`Updated ${property}`);
      }

      mutateUser();
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error(`Error updating ${property}`);
    }).finally(() => {
      setIsLoading(false);
    });
  }

  function updateName(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    updateUser(
      JSON.stringify({
        name: name,
      }),
      'username',
    );
  }

  function updateEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    updateUser(
      JSON.stringify({
        email: email,
      }),
      'email',
    );
  }

  function updatePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (password !== password2) {
      toast.error('Password does not match');

      return;
    }

    updateUser(
      JSON.stringify({
        currentPassword: currentPassword,
        password: password,
      }),
      'password',
    );
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
        <div
          style={{
            display: 'table',
            margin: '0 auto',
          }}
        >
          <form onSubmit={updateName}>
            <label htmlFor='name'>Username:</label>
            <br/>
            <input
              type='text'
              name='name'
              placeholder='Enter username'
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ color: 'rgb(0, 0, 0)' }}
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
              style={{ color: 'rgb(0, 0, 0)' }}
              required
            />
            <br/>
            <input className='cursor-pointer underline' type='submit' value='Update'></input>
          </form>
          <br/>
          <form onSubmit={updatePassword}>
            <label htmlFor='email'>Password:</label>
            <br/>
            <input
              type='password'
              name='currentPassword'
              placeholder='Enter current password'
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              style={{ color: 'rgb(0, 0, 0)' }}
              required
            />
            <br/>
            <input
              type='password'
              name='password'
              placeholder='Enter new password'
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ color: 'rgb(0, 0, 0)' }}
              required
            />
            <br/>
            <input
              type='password'
              name='password2'
              placeholder='Re-enter new password'
              value={password2}
              onChange={e => setPassword2(e.target.value)}
              style={{ color: 'rgb(0, 0, 0)' }}
              required
            />
            <br/>
            <input className='cursor-pointer underline' type='submit' value='Update'></input>
          </form>
          <br/>
        </div>
        <div
          style={{
            display: 'table',
            margin: '0 auto',
          }}
        >
          <button onClick={deleteAccount}>DELETE ACCOUNT</button>
        </div>
      </>
    </Page>
  );
}
