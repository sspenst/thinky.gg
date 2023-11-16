import { useRouter } from 'next/router';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import FormTemplate from './formTemplate';

interface ResetPasswordFormProps {
  token: string;
  userId: string;
}

export default function ResetPasswordForm({ token, userId }: ResetPasswordFormProps) {
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [password2, setPassword2] = useState<string>('');
  const router = useRouter();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    toast.dismiss();

    if (password !== password2) {
      toast.error('Password does not match');

      return;
    }

    toast.loading('Resetting password...');

    fetch('/api/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        password: password,
        token: token,
        userId: userId,
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(res => {
      if (res.status === 200) {
        toast.dismiss();
        toast.success('Password reset successfully');
        router.replace('/login');
      } else {
        throw res.text();
      }
    }).catch(async err => {
      try {
        setErrorMessage(JSON.parse(await err)?.error);
      } catch {
        console.error(err);
      } finally {
        toast.dismiss();
        toast.error('Error resetting password');
      }
    });
  }

  return (
    <FormTemplate>
      <h1 className='text-xl font-bold text-center'>Reset Password</h1>
      <form onSubmit={onSubmit}>
        <div className='mb-4'>
          <label className='block text-sm font-bold mb-2' htmlFor='password'>
            Password
          </label>
          <input onChange={e => setPassword(e.target.value)} className='shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline' id='password' type='password' placeholder='******************' />
        </div>
        <div>
          <label className='block text-sm font-bold mb-2' htmlFor='password2'>
            Re-enter password
          </label>
          <input onChange={e => setPassword2(e.target.value)} className='shadow appearance-none border rounded w-full py-2 px-3 mb-3 leading-tight focus:outline-none focus:shadow-outline' id='password2' type='password' placeholder='******************' />
        </div>
        <div className='text-red-500 text-xs italic mb-4'>
          {errorMessage}
        </div>
        <div className='flex items-center justify-between'>
          <input className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer' type='submit' value='Reset' />
        </div>
      </form>
    </FormTemplate>
  );
}
