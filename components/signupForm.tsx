import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import { useSWRConfig } from 'swr';
import { AppContext } from '../contexts/appContext';
import FormTemplate from './formTemplate';

export default function SignupForm() {
  const { cache } = useSWRConfig();
  const [email, setEmail] = useState<string>('');
  const { mutateUser, setShouldAttemptAuth } = useContext(AppContext);
  const [password, setPassword] = useState<string>('');
  const [password2, setPassword2] = useState<string>('');
  const router = useRouter();
  const [username, setUsername] = useState<string>('');

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (password !== password2) {
      toast.dismiss();
      toast.error('Password does not match');

      return;
    }

    if (username.length < 3 || username.length > 50) {
      toast.dismiss();
      toast.error('Username must be between 3 and 50 characters');

      return;
    }

    if (username.match(/[^-a-zA-Z0-9_]/)) {
      toast.dismiss();
      toast.error('Username can only contain letters, numbers, underscores, and hyphens');

      return;
    }

    toast.dismiss();
    toast.loading('Registering...');

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
          // clear cache
          for (const key of cache.keys()) {
            cache.delete(key);
          }

          toast.dismiss();
          toast.success('Registered!');

          // clear localstorage value
          window.localStorage.removeItem('tutorialCompletedAt');
          mutateUser();
          setShouldAttemptAuth(true);
          sessionStorage.clear();

          if (tutorialCompletedAt !== '0') {
            router.push('/play');
          } else {
            router.push('/tutorial');
          }
        }
      } else {
        throw res.text();
      }
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error);
    });
  }

  return (
    <FormTemplate>
      <form onSubmit={onSubmit}>
        <div className='mb-4'>
          <label className='block text-sm font-bold mb-2' htmlFor='email'>
            Email
          </label>
          <input required onChange={e => setEmail(e.target.value)} value={email} className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline' id='email' type='email' placeholder='Email' />
        </div>
        <div className='mb-4'>
          <label className='block text-sm font-bold mb-2 ' htmlFor='username'>
            Username
          </label>
          <input required onChange={e => setUsername(e.target.value)} className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline' id='username' type='text' placeholder='Username' />
        </div>
        <div>
          <label className='block text-sm font-bold mb-2' htmlFor='password'>
            Password
          </label>
          <input onChange={e => setPassword(e.target.value)} className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline' id='password' type='password' placeholder='******************' />
        </div>
        <div>
          <label className='block text-sm font-bold mb-2' htmlFor='password2'>
            Re-enter password
          </label>
          <input onChange={e => setPassword2(e.target.value)} className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline' id='password2' type='password' placeholder='******************' />
        </div>
        <div className='flex items-center justify-between gap-1 pb-3'>
          <input type='checkbox' id='terms_agree_checkbox' required />
          <label htmlFor='terms_agree_checkbox' className='text-xs p-1'>
            I agree to the <Link
              href='https://docs.google.com/document/d/e/2PACX-1vR4E-RcuIpXSrRtR3T3y9begevVF_yq7idcWWx1A-I9w_VRcHhPTkW1A7DeUx2pGOcyuKifEad3Qokn/pub'
              target='_blank'
              rel='noreferrer'
              className='underline'>terms of service</Link> & reviewed the <Link
              href='https://docs.google.com/document/d/e/2PACX-1vSNgV3NVKlsgSOEsnUltswQgE8atWe1WCLUY5fQUVjEdu_JZcVlRkZcpbTOewwe3oBNa4l7IJlOnUIB/pub'
              className='underline'>privacy policy</Link>
          </label>
        </div>
        <div className='flex items-center justify-between gap-1'>
          <input className={'bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer'} type='submit' value='Sign Up' />
        </div>
      </form>
    </FormTemplate>
  );
}
