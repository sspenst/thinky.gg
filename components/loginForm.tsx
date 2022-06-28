import React, { useState } from 'react';
import FormTemplate from './formTemplate';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';

export default function LoginForm() {
  const [name, setName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const router = useRouter();
  const [ error_message, setError_message ] = useState<string>('');

  function onSubmit(event: React.FormEvent) {
    toast.dismiss();
    toast.loading('Logging in');
    event.preventDefault();
    fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        name: name,
        password: password,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(res => {
      if (res.status === 200) {
        toast.dismiss();
        toast.success('Logged in');
        router.push('/');
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Could not log in. Please try again');
    });
  }

  return (
    <FormTemplate>
      <>
        <div className='mb-4'>
          <label className='block text-sm font-bold mb-2 ' htmlFor='username'>
            Username
          </label>
          <input onChange={e => setName(e.target.value)} className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline' id='username' type='text' placeholder='Username'/>
        </div>
        <div className='mb-6'>
          <label className='block text-sm font-bold mb-2' htmlFor='password'>
            Password
          </label>
          <input onChange={e => setPassword(e.target.value)} className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline' id='password' type='password' placeholder='******************'/>
          <p className='text-red-500 text-xs italic'>{error_message}</p>
        </div>
        <div className='flex items-center justify-between'>
          <button onClick={onSubmit} className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline' type='button'>
            Sign In
          </button>
          <Link href='/forgot-password'>
            <a className='inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800'>
              Forgot Password?
            </a>
          </Link>
        </div>
      </>
    </FormTemplate>
  );
}
