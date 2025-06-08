import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import Page from '../../../components/page/page';

interface GoogleMobileAuthProps {
  googleAuthUrl: string;
  redirectUrl: string;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { redirect } = context.query;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const origin = redirect || `${context.req.headers['x-forwarded-proto'] || 'https'}://${context.req.headers.host}`;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

  console.log('redirectUri', redirectUri, clientId, origin);

  if (!clientId) {
    return {
      notFound: true,
    };
  }

  const scope = 'openid profile email';
  const state = Buffer.from(JSON.stringify({
    origin: origin,
    timestamp: Date.now(),
    mobile: true
  })).toString('base64');

  const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    'response_type=code&' +
    `scope=${encodeURIComponent(scope)}&` +
    `state=${state}`;

  return {
    props: {
      googleAuthUrl,
      redirectUrl: origin as string,
    },
  };
}

export default function GoogleMobileAuth({ googleAuthUrl, redirectUrl }: GoogleMobileAuthProps) {
  const router = useRouter();

  // Auto-redirect after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = googleAuthUrl;
    }, 2000);

    return () => clearTimeout(timer);
  }, [googleAuthUrl]);

  const handleOpenBrowser = () => {
    console.log('googleAuthUrl', googleAuthUrl);
    window.open(googleAuthUrl, 'system');
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <Page title='Google Sign In'>
      <div className='flex justify-center w-full px-4 py-8'>
        <div className='w-full max-w-md'>
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
            <div className='text-center mb-6'>
              <div className='w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4'>
                <svg className='w-8 h-8 text-blue-600 dark:text-blue-400' viewBox='0 0 24 24'>
                  <path fill='#4285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' />
                  <path fill='#34A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
                  <path fill='#FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
                  <path fill='#EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
                </svg>
              </div>
              <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>Continue with Google</h1>
              <p className='text-sm text-gray-600 dark:text-gray-400 mb-6'>
                For security reasons, Google sign-in needs to open in your device&apos;s browser.
                We&apos;ll redirect you automatically, or you can tap the button below.
              </p>
            </div>
            <div className='space-y-3'>
              <button
                onClick={handleOpenBrowser}
                className='w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors'
              >
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' />
                </svg>
                Open in Browser
              </button>
              <button
                onClick={handleGoBack}
                className='w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium py-3 px-4 rounded-lg transition-colors'
              >
                Go Back
              </button>
            </div>
            <div className='mt-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                After signing in with Google, you&apos;ll be redirected back to the app automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
