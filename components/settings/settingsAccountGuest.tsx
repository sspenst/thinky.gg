import { useRouter } from 'next/router';
import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function SettingsAccountGuest() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [username, setUsername] = useState('');

  async function fetchSignup() {
    toast.dismiss();
    toast.loading('Creating account...');

    fetch('/api/guest-convert', {
      method: 'PUT',
      body: JSON.stringify({
        name: username,
        email: email,
        password: password,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(async(res) => {
      if (res.status !== 200) {
        throw res.text();
      } else {
        toast.dismiss();
        toast.success('Account created');
        router.push('/confirm-email');
      }
    }).catch(async err => {
      const error = await err;

      console.error(error);
      toast.dismiss();

      let errorStr = 'Error creating account';

      try {
        errorStr = JSON.parse(error).error;
      } catch {
        if (typeof error === 'string') {
          errorStr = error;
        }
      }

      toast.error(errorStr, { duration: 3000 });
    });
  }

  const inputClass = 'shadow appearance-none border border-color-4 mb-2 rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline';

  return (
    <div className='flex flex-col gap-4 items-center max-w-sm text-center'>
      <span>
        You are currently logged in with a <span className='font-bold'>guest account</span>.
      </span>
      <span>
        Convert to a regular account by filling out the following:
      </span>
      <div className='flex flex-col w-full max-w-full'>
        <input className={inputClass} placeholder='Username' type='text' required onChange={(e) => { setUsername(e.target.value); }} />
        <input className={inputClass} placeholder='Email' type='email' required onChange={(e) => { setEmail(e.target.value);}} />
        <input className={inputClass} placeholder='Password' type='password' required onChange={(e) => { setPassword(e.target.value); }} />
      </div>
      <div className='flex justify-end'>
        <button className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer'
          onClick={fetchSignup}
        >
          Convert
        </button>
      </div>
    </div>
  );
}
