import { useRouter } from 'next/router';
import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../contexts/appContext';
import FormTemplate from './formTemplate';

export default function SignupForm() {
  const [email, setEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [password2, setPassword2] = useState<string>('');
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const { setIsLoading } = useContext(AppContext);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (password !== password2) {
      toast.dismiss();
      toast.error('Password does not match');

      return;
    }

    setIsLoading(true);
    const tutorialCompletedAt = window.localStorage.getItem('tutorialCompletedAt') || '0';

    fetch('/api/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        name: username,
        password: password,
        tutorialCompletedAt: parseInt(tutorialCompletedAt),
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(async res => {
      if (res.status === 200) {
        const resObj = await res.json();

        if (resObj.sentMessage) {
          toast.dismiss();
          toast.error('An account with this email already exists! Please check your email to set your password.');
        } else {
          toast.dismiss();
          toast.success('Registered!');
          // clear localstorage value
          window.localStorage.removeItem('tutorialCompletedAt');
          router.push('/');
        }
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
        toast.error('Error signing up');
      }
    });
  }

  return (
    <FormTemplate>
      <form onSubmit={onSubmit}>
        <div className='mb-4'>
          <label className='block text-sm font-bold mb-2' htmlFor='email'>
            Email
          </label>
          <input required onChange={e => setEmail(e.target.value)} value={email} className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline' id='email' type='email' placeholder='Email'/>
        </div>
        <div className='mb-4'>
          <label className='block text-sm font-bold mb-2 ' htmlFor='username'>
            Username
          </label>
          <input onChange={e => setUsername(e.target.value)} className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline' id='username' type='text' placeholder='Username'/>
        </div>
        <div>
          <label className='block text-sm font-bold mb-2' htmlFor='password'>
            Password
          </label>
          <input onChange={e => setPassword(e.target.value)} className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline' id='password' type='password' placeholder='******************'/>
        </div>
        <div>
          <label className='block text-sm font-bold mb-2' htmlFor='password2'>
            Re-enter password
          </label>
          <input onChange={e => setPassword2(e.target.value)} className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline' id='password2' type='password' placeholder='******************'/>
        </div>
        <div className='text-red-500 text-xs italic mb-4'>
          {errorMessage}
        </div>
        <div className='flex items-center justify-between'>
          <input className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer' type='submit' value='Sign Up'/>
        </div>
      </form>
    </FormTemplate>
  );
}
