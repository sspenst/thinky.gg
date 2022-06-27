import React, { useContext, useState } from 'react';

import { AppContext } from '../contexts/appContext';
import { PageContext } from '../contexts/pageContext';
import toast from 'react-hot-toast';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState<string>('');
  const [isSent, setIsSent] = useState(false);
  const { setIsLoading } = useContext(AppContext);
  const { windowSize } = useContext(PageContext);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    setIsLoading(true);
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
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error sending password reset email for this email address');
    });
  }

  return (

    <div className="w-full max-w-xs mx-auto p-3 py-12">
      <form className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4 ">
          <label className="block text-gray-700 text-sm font-bold mb-2 " htmlFor="email">
        Send a forgot email request
          </label>
          <input required onChange={e => setEmail(e.target.value)} value={email} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="email" type="email" placeholder="Email"/>
        </div>
        <div className="flex items-center justify-between">
          <button disabled={isSent} onClick={onSubmit} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="button">
        Send
          </button>
        </div>
      </form>
    </div>

  );
}
