import FormTemplate from '@root/components/forms/formTemplate';
import Page from '@root/components/page/page';
import StyledTooltip from '@root/components/page/styledTooltip';
import { TERMS_OF_SERVICE_URL } from '@root/constants/externalLinks';
import { AppContext } from '@root/contexts/appContext';
import { blueButton } from '@root/helpers/className';
import { getUserFromToken } from '@root/lib/withAuth';
import classNames from 'classnames';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import React, { useContext, useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { toast } from 'react-hot-toast';
import { useSWRConfig } from 'swr';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (reqUser) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {
      recaptchaPublicKey: process.env.RECAPTCHA_PUBLIC_KEY ?? null,
    },
  };
}

interface PlayAsGuestProps {
  recaptchaPublicKey: string | null;
}

/* istanbul ignore next */
export default function PlayAsGuest({ recaptchaPublicKey }: PlayAsGuestProps) {
  const { cache } = useSWRConfig();
  const { mutateUser, setShouldAttemptAuth, userConfig } = useContext(AppContext);
  const [name, setName] = useState<string>('');
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [registrationState, setRegistrationState] = useState('registering');
  const [showRecaptcha, setShowRecaptcha] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string>('');

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
        className='bg-neutral-500 hover:bg-neutral-600 text-white font-bold py-1 px-1 rounded focus:outline-none focus:shadow-outline cursor-pointer'
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

  async function fetchSignup(recaptchaToken: string | null) {
    if (recaptchaPublicKey) {
      if (!showRecaptcha) {
        setShowRecaptcha(true);

        return;
      }

      if (!recaptchaToken) {
        toast.error('Please complete the recaptcha');

        return;
      }

      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
    }

    const tutorialCompletedAt = window.localStorage.getItem('tutorialCompletedAt') || '0';
    const utm_source = window.localStorage.getItem('utm_source') || '';

    toast.dismiss();
    toast.loading('Creating guest account...');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = {
      email: 'guest@guest.com',
      guest: true,
      name: 'Guest',
      password: 'guest-account',
      tutorialCompletedAt: tutorialCompletedAt,
      utm_source: utm_source,
    };

    if (recaptchaToken) {
      body.recaptchaToken = recaptchaToken;
    }

    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(body)
    });

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
      // add query parameter to url, call it ?complete=true. for conversion tracking easieness
      const url = new URL(window.location.href);

      url.searchParams.set('signedup', 'true');
      window.history.replaceState({}, '', url.toString());
    }
  }

  return (
    <Page title='Play as Guest'>
      <FormTemplate title={registrationState === 'registered' ? 'Guest account created!' : 'Play as guest'}>
        <div className='flex flex-col items-center justify-center gap-4'>
          {registrationState === 'registered' ?
            <div className='flex flex-col gap-6'>
              <div>
                <label className='block text-sm font-medium mb-2' htmlFor='username'>Username</label>
                <div className='relative'>
                  <input
                    className='w-full'
                    id='username'
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    readOnly
                    type='text'
                    value={name}
                  />
                  <div className='absolute inset-y-0 right-1.5 flex items-center px-1'>
                    <CopyToClipboardButton text={name} />
                  </div>
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium mb-2' htmlFor='password'>Password</label>
                <div className='relative'>
                  <input
                    className='w-full'
                    id='password'
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    readOnly
                    type='password'
                    value={temporaryPassword}
                  />
                  <div className='absolute inset-y-0 right-1.5 flex items-center px-1'>
                    <CopyToClipboardButton text={temporaryPassword} />
                  </div>
                </div>
              </div>
              <span className='text-sm'>
                Please save your password as you <span className='font-bold underline'>will not be able to recover it</span> unless you convert to a regular account.
              </span>
              <Link
                className='bg-blue-500 hover:bg-blue-600 text-white text-center w-full font-medium py-2 px-3 rounded'
                href={userConfig?.tutorialCompletedAt ? '/play' : '/tutorial'}
              >
                Continue
              </Link>
            </div>
            :
            <div className='flex flex-col gap-6 items-center'>
              <ul className='text-left text-sm gap-4 flex flex-col'>
                <li>Your progress is saved and you can convert to a regular account later</li>
                <li>You cannot review or create levels with a guest account</li>
                <li>Your guest account may be deleted after 7 days of no activity</li>
                <li>By creating a guest account you agree to our <a className='underline' href={TERMS_OF_SERVICE_URL} rel='noreferrer' target='_blank'>terms of service</a> and reviewed the <a className='underline' href='https://docs.google.com/document/d/e/2PACX-1vSNgV3NVKlsgSOEsnUltswQgE8atWe1WCLUY5fQUVjEdu_JZcVlRkZcpbTOewwe3oBNa4l7IJlOnUIB/pub' rel='noreferrer' target='_blank'>privacy policy</a></li>
              </ul>
              {recaptchaPublicKey && showRecaptcha ?
                <ReCAPTCHA
                  onChange={(token) => fetchSignup(token)}
                  ref={recaptchaRef}
                  sitekey={recaptchaPublicKey}
                />
                :
                <button className={classNames(blueButton, 'w-full')} onClick={() => fetchSignup(null)}>
                  Play as guest
                </button>
              }
              <Link className='font-medium text-sm text-blue-500 hover:text-blue-400' href='/signup'>
                Sign up with a regular account
              </Link>
            </div>
          }
        </div>
      </FormTemplate>
    </Page>
  );
}
