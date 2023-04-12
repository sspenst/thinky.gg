import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function SettingsAccountGuest() {
  const inputClass = 'shadow appearance-none border mb-2 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline';

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');

  async function fetchSignup() {
    if (password !== password2) {
      toast.dismiss();
      toast.error('Password does not match');

      return;
    }

    toast.dismiss();
    toast.loading('Creating account...');
    const res = await fetch('/api/user', {
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
    });

    if (!res.ok) {
      toast.dismiss();
      const { error } = await res.json();

      toast.error(error || 'Error creating account');
    } else {
      toast.dismiss();
      toast.success('Account created');
      // refresh page
      window.location.reload();
    }
  }

  return (
    <div className='flex justify-center items-center'>
      <div className='flex flex-col gap-6'>
        <div className='flex flex-col gap-2'>
          <div className='block font-bold'>
            Guest Account
          </div>
          <div className='block text-sm'>
            You are currently logged in as a guest account which is a restricted account.<br /><br />Upgrade to a full account by filling out the below.
          </div>
          <input className={inputClass} placeholder='Username' type='text' required onChange={(e) => { setUsername(e.target.value); }} />
          <input className={inputClass} placeholder='Email' type='email' required onChange={(e) => { setEmail(e.target.value);}} />
          <input className={inputClass} placeholder='Password' type='password' required onChange={(e) => { setPassword(e.target.value); }} />
          <input className={inputClass} onChange={(e) => { setPassword2(e.target.value); }} placeholder='Confirm Password' type='password' required />
          <div className='flex justify-end'>
            <button className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer'
              onClick={fetchSignup}
            >
              Convert to regular account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
