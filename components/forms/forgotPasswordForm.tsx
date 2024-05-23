import Link from 'next/link';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import FormTemplate from './formTemplate';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSent, setIsSent] = useState(false);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    toast.dismiss();
    toast.loading('Sending reset email...');

    fetch('/api/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(res => {
      if (res.status === 200) {
        toast.dismiss();
        toast.success('Email sent');
        setIsSent(true);
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
        toast.error('Error sending password reset email for this email address');
      }
    });
  }

  return (
    <FormTemplate title='Reset your password'>
      <form className='flex flex-col gap-6' onSubmit={onSubmit}>
        <div>
          <label className='block mb-2' htmlFor='email'>Email</label>
          <input required onChange={e => setEmail(e.target.value)} value={email} className='w-full' id='email' type='email' placeholder='Email' />
        </div>
        <button className='bg-blue-500 hover:bg-blue-600 text-white w-full font-medium py-2 px-3 rounded' disabled={isSent} type='submit'>Continue</button>
        {errorMessage &&
          <div className='text-red-500 text-sm text-center'>
            {errorMessage}
          </div>
        }
        <div className='text-center text-sm'>
          <Link
            className='font-medium text-sm text-blue-500 hover:text-blue-400'
            href='/login'
          >
            Return to log in
          </Link>
        </div>
      </form>
    </FormTemplate>
  );
}
