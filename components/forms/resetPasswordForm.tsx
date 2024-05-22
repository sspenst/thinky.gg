import { useRouter } from 'next/router';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import FormTemplate from './formTemplate';

interface ResetPasswordFormProps {
  token: string | null;
  userId: string | null;
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

  if (!token || !userId) {
    return (
      <div className='flex flex-col items-center gap-4 py-24 px-4'>
        <h2 className='text-2xl font-medium'>
          Invalid reset link
        </h2>
      </div>
    );
  }

  return (
    <FormTemplate title='Reset your password'>
      <form className='flex flex-col gap-6' onSubmit={onSubmit}>
        <div>
          <label className='block mb-2' htmlFor='password'>
            Password
          </label>
          <input onChange={e => setPassword(e.target.value)} className='w-full' id='password' type='password' placeholder='Password' />
        </div>
        <div>
          <label className='block mb-2' htmlFor='password2'>
            Re-enter password
          </label>
          <input onChange={e => setPassword2(e.target.value)} className='w-full' id='password2' type='password' placeholder='Password' />
        </div>
        <button className='bg-blue-500 hover:bg-blue-600 text-white w-full font-medium py-2 px-3 rounded mt-2' type='submit'>Continue</button>
        {errorMessage &&
          <div className='text-red-500 text-sm text-center'>
            {errorMessage}
          </div>
        }
      </form>
    </FormTemplate>
  );
}
