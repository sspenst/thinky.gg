import Page from '@root/components/page';
import StyledTooltip from '@root/components/styledTooltip';
import { AppContext } from '@root/contexts/appContext';
import redirectToHome from '@root/helpers/redirectToHome';
import { GetServerSidePropsContext } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { toast } from 'react-hot-toast';
import { useSWRConfig } from 'swr';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const redirect = await redirectToHome(context);

  if (redirect.redirect) {
    return redirect;
  }

  return {
    props: {
      recaptchaPublicKey: process.env.RECAPTCHA_PUBLIC_KEY || '',
    },
  };
}

export default function PlayAsGuest({ recaptchaPublicKey }: {recaptchaPublicKey?: string}) {
  const [registrationState, setRegistrationState] = useState('registering');
  const [recaptchaToken, setRecaptchaToken] = useState<string>('');
  const router = useRouter();
  const [name, setName] = useState<string>('');
  const [temporaryPassword, setTemporaryPassword] = useState<string>('');
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { cache } = useSWRConfig();
  const { mutateUser, setShouldAttemptAuth } = useContext(AppContext);

  function onRecaptchaChange(value: string | null) {
    if (value) {
      setRecaptchaToken(value);
    }
  }

  const CopyToClipboardButton = ({ text }: { text: string }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
      navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.dismiss();
      toast.success('Copied to clipboard!');
      setTimeout(() => setIsCopied(false), 3000);
    };

    return (
      <button
        data-tooltip-content='Copy to clipboard'
        data-tooltip-id={'copy-to-clipboard-' + text}
        className='bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-1 rounded focus:outline-none focus:shadow-outline cursor-pointer'
        onClick={handleCopy}
      > <StyledTooltip id={'copy-to-clipboard-' + text} />
        {isCopied ? <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-clipboard-check-fill' viewBox='0 0 16 16'>
          <path d='M6.5 0A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3Zm3 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3Z' />
          <path d='M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1A2.5 2.5 0 0 1 9.5 5h-3A2.5 2.5 0 0 1 4 2.5v-1Zm6.854 7.354-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L7.5 10.793l2.646-2.647a.5.5 0 0 1 .708.708Z' />
        </svg> : <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-clipboard2' viewBox='0 0 16 16'>
          <path d='M3.5 2a.5.5 0 0 0-.5.5v12a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-12a.5.5 0 0 0-.5-.5H12a.5.5 0 0 1 0-1h.5A1.5 1.5 0 0 1 14 2.5v12a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 14.5v-12A1.5 1.5 0 0 1 3.5 1H4a.5.5 0 0 1 0 1h-.5Z' />
          <path d='M10 .5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5.5.5 0 0 1-.5.5.5.5 0 0 0-.5.5V2a.5.5 0 0 0 .5.5h5A.5.5 0 0 0 11 2v-.5a.5.5 0 0 0-.5-.5.5.5 0 0 1-.5-.5Z' />
        </svg>}
      </button>
    );
  };
  const text = registrationState === 'registered' ?
    <div className='text-center flex flex-col gap-2'>
      <div>Guest account created!</div>
      <div className='flex justify-center'>
        <div className='flex flex-row align-center self-center gap-3'>
          <label htmlFor='username' className='block text-lg font-bold self-center align-center'>
        Username:
          </label>
          <div className='relative'>
            <input
              id='username'
              type='text'
              readOnly
              value={name}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className='shadow appearance-none border rounded-lg w-full py-2 px-1 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white'
            />
            <div className='absolute inset-y-0 right-0 flex items-center px-1'>
              <CopyToClipboardButton text={name} />
            </div>
          </div>
        </div>
      </div>
      <div className='flex flex-row align-center self-center gap-3'>
        <label htmlFor='password' className='block text-lg font-bold  self-center align-center'>
        Password:
        </label>
        <div className='relative'>
          <input
            id='password'
            type='text'
            readOnly
            value={temporaryPassword}

            onClick={(e) => (e.target as HTMLInputElement).select()}
            className='shadow appearance-none border rounded-lg w-full py-2 px-1 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white'
          />
          <div className='absolute inset-y-0 right-0 flex items-center px-1'>
            <CopyToClipboardButton text={temporaryPassword} />
          </div>
        </div>
      </div>
      <div className='text-md mb-2'>
    Please save your password as you <span className='font-bold underline'>will not be able to recover it</span> unless you convert to a regular (free) account.
      </div>
      <button
        className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer'
        onClick={() => {
          const tutorialCompletedAt = window.localStorage.getItem('tutorialCompletedAt') || '0';

          if (tutorialCompletedAt !== '0') {
            router.push('/play');
          } else {
            router.push('/tutorial');
          }
        }}
      >
    Continue
      </button>
    </div>

    :
    <div className='text-lg'>
      <div className='text-center'>
        <span className='block text-lg font-medium mb-4'>Create a guest account</span>
        <ul className='text-left list-disc pl-6 text-sm'>
          <li className='mb-2'>Your progress is saved and you can convert to a regular account via account settings</li>
          <li className='mb-2'>You aren&apos;t able to comment on profiles or review levels as a guest</li>
          <li className='mb-2'>Your guest account may be deleted after 7 days of no activity</li>
          <li className='mb-2'>By creating a guest account you agree to our <a className='underline' href='https://docs.google.com/document/d/e/2PACX-1vR4E-RcuIpXSrRtR3T3y9begevVF_yq7idcWWx1A-I9w_VRcHhPTkW1A7DeUx2pGOcyuKifEad3Qokn/pub' rel='noreferrer' target='_blank'>terms of service</a> and reviewed the <a className='underline' href='https://docs.google.com/document/d/e/2PACX-1vSNgV3NVKlsgSOEsnUltswQgE8atWe1WCLUY5fQUVjEdu_JZcVlRkZcpbTOewwe3oBNa4l7IJlOnUIB/pub' rel='noreferrer' target='_blank'>privacy policy</a></li>
        </ul>
      </div>

      <div className='w-full pt-2 justify-center flex'>
        <ReCAPTCHA
          onChange={onRecaptchaChange}

          ref={recaptchaRef}
          sitekey={recaptchaPublicKey ?? ''}
        />
      </div>
      <div className='p-3 text-center flex flex-col gap-3'>
        <button className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer' onClick={fetchSignup}>
        Create
        </button>
        <Link className='text-sm hover:underline' href='/signup'>Create (free) regular account instead</Link>
      </div>
    </div>;

  async function fetchSignup() {
    const tutorialCompletedAt = window.localStorage.getItem('tutorialCompletedAt') || '0';

    toast.dismiss();
    toast.loading('Creating guest account...');
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',

      body: JSON.stringify({
        name: 'Guest',
        email: 'guest@guest.com',
        password: 'guest-account',
        recaptchaToken: recaptchaToken,
        guest: true,
        tutorialCompletedAt: tutorialCompletedAt
      })
    });

    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
    }

    if (!res.ok) {
      toast.dismiss();
      toast.error('Error creating guest account');
    }

    if (res.status === 200) {
      // clear cache
      for (const key of cache.keys()) {
        cache.delete(key);
      }

      toast.dismiss();
      toast.success('Guest account created');
      setRegistrationState('registered');
      // clear localstorage value
      window.localStorage.removeItem('tutorialCompletedAt');
      mutateUser();
      setShouldAttemptAuth(true);
      sessionStorage.clear();
      const { name, temporaryPassword } = await res.json();

      setName(name);
      setTemporaryPassword(temporaryPassword);
    }
  }

  return (
    <Page
      title='Play as Guest'
    >
      <div className='flex flex-col items-center justify-center p-3'>
        <h1 className='text-2xl font-bold mb-6'>
            Play as Guest
        </h1>
        <div>
          {text}
        </div>
      </div>

    </Page>
  );
}
