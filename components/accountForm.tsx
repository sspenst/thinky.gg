import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../contexts/appContext';
import FormTemplate from './formTemplate';
import UploadImage from './uploadImage';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import useStats from '../hooks/useStats';
import useUser from '../hooks/useUser';

export default function Account() {
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const { mutateUser, user } = useUser();
  const { mutateStats } = useStats();
  const [password, setPassword] = useState<string>('');
  const [password2, setPassword2] = useState<string>('');
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setUsername(user.name);
    }
  }, [user]);

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

  function updateUsername(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    updateUser(
      JSON.stringify({
        name: username,
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

  return (
    <FormTemplate>
      <>
        <UploadImage/>
        <form onSubmit={updateUsername}>
          <div className='mb-4'>
            <label className='block font-bold mb-2' htmlFor='username'>
              Username
            </label>
            <input
              className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
              id='username'
              name='username'
              onChange={e => setUsername(e.target.value)}
              placeholder='Username'
              required
              type='text'
              value={username}
            />
            <input className='italic cursor-pointer underline' type='submit' value='Update'/>
          </div>
        </form>
        <form onSubmit={updateEmail}>
          <div className='mb-4'>
            <label className='block font-bold mb-2' htmlFor='email'>
              Email
            </label>
            <input
              className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
              id='email'
              name='email'
              onChange={e => setEmail(e.target.value)}
              placeholder='Email'
              required
              type='email'
              value={email}
            />
            <input className='italic cursor-pointer underline' type='submit' value='Update'/>
          </div>
        </form>
        <form onSubmit={updatePassword}>
          <div>
            <label className='block font-bold mb-2' htmlFor='password'>
              Password
            </label>
            <input onChange={e => setCurrentPassword(e.target.value)} className='shadow appearance-none border mb-2 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline' id='password' value={currentPassword} type='password' placeholder='Enter current password' required/>
          </div>
          <div>
            <input onChange={e => setPassword(e.target.value)} className='shadow appearance-none border mb-2 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline' type='password' placeholder='Enter new password' required/>
          </div>
          <div className='mb-2'>
            <input onChange={e => setPassword2(e.target.value)} className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline' type='password' placeholder='Re-enter new password' required/>
            <input className='italic mb-3 cursor-pointer underline' type='submit' value='Update'/>
          </div>
        </form>
        <div className='flex items-center justify-between'>
          <button onClick={deleteAccount} className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline' type='button'>
            Delete Account
          </button>
        </div>
      </>
    </FormTemplate>
  );
}
