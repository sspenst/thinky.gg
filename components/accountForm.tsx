import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../contexts/appContext';
import FormTemplate from './formTemplate';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import useStats from '../hooks/useStats'; 
import useUser from '../hooks/useUser';

export default function Account() {
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const { error, isLoading, mutateUser, user } = useUser();
  const { mutateStats } = useStats();
  const [name, setName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [password2, setPassword2] = useState<string>('');
  const [username, setUsername] = useState<string>('');
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
        name: username,
      }),
      'username',
    );
    console.log(username);
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

  

  return (
    <FormTemplate>
      <>
      <form onSubmit={updateName}>
        <div className='mb-4'>
          <label className='block text-sm font-bold mb-2 ' htmlFor='username'>
            Username
          </label>
          <input onChange={e => setUsername(e.target.value)} className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline' id='username' type='text' placeholder='Username'/>
          <input className='italic cursor-pointer underline' type='submit' value='Update'></input>
        </div>
        </form >
        <div className='mb-4'>
          <label className='block text-sm font-bold mb-2' htmlFor='email'>
            Email
          </label>
          <input onChange={e => updateEmail(e.target.value)} value={email} className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline' id='email' type='email' placeholder='Email'/>
          <input className='italic cursor-pointer underline' type='submit' value='Update'></input>
        </div>
        <div>
          <label htmlFor='email'>Password:</label>
            <input onChange={e => setCurrentPassword(e.target.value)} autoComplete="new-password"className='shadow appearance-none border mb-2 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline' id='password' value={currentPassword} type='password' placeholder='Enter current password'/>
        </div>
        <div>
          <input onChange={e => setPassword(e.target.value)} className='shadow appearance-none border mb-2 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline' type='password' placeholder='Enter new password'/>
        </div>
        <div>
          <input onChange={e => setPassword2(e.target.value)} className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline' type='password' placeholder='Re-enter new password'/>
          <input className='italic mb-3 cursor-pointer underline' type='submit' value='Update'></input>
        </div>
        <div className='flex items-center justify-between'>
          <button onClick={deleteAccount} className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline' type='button'>
            Delete Account
          </button>
        </div>
      </>
    </FormTemplate>
  );
}
