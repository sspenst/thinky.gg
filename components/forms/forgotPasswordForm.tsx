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
    <FormTemplate>
      <form onSubmit={onSubmit}>
        <div>
          <label className='block text-sm font-bold mb-2' htmlFor='email'>
            Send a password reset email
          </label>
          <input required onChange={e => setEmail(e.target.value)} value={email} className='shadow appearance-none border rounded w-full py-2 px-3 mb-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline' id='email' type='email' placeholder='Email' />
        </div>
        <div className='text-red-500 text-xs italic mb-4'>
          {errorMessage}
        </div>
        <div className='flex items-center justify-between'>
          <input disabled={isSent} className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer' type='submit' value='Send' />
        </div>
      </form>
    </FormTemplate>
  );
}
