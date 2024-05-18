import Page from '@root/components/page/page';
import { AppContext } from '@root/contexts/appContext';
import { getUserFromToken } from '@root/lib/withAuth';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import Router from 'next/router';
import React, { useContext, useEffect } from 'react';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  // if not logged in redirect
  if (!reqUser) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {
    },
  };
}

export default function ConfirmPage() {
  const { user, mutateUser } = useContext(AppContext);

  useEffect(() => {
    if (user?.emailConfirmed) {
      const tutorialCompletedAt = user.config.tutorialCompletedAt;

      if (tutorialCompletedAt !== 0) {
        Router.push('/play?signedup=true');
      } else {
        Router.push('/tutorial?signedup=true');
      }
    }
  }, [user?.config.tutorialCompletedAt, user?.emailConfirmed]);

  // mutateUser every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      mutateUser();
    }, 3000);

    return () => clearInterval(interval);
  }, [mutateUser]);

  return (
    <Page title='Confirm Email'>
      <div className='flex p-20 flex-col'>
        <h1 className='text-4xl'>One more step...</h1>
        <p className='text-lg mt-8'>
          We have sent you an email to <span className='font-bold'>confirm your email address</span>.<br />Check your inbox <span className='font-bold'>{user?.email}</span> and click the link to confirm and you will be all set!
        </p>
        <p className='text-lg mt-8'>
            Haven&apos;t received the email? <br />Check your spam folder or <Link href={'/settings'} className='underline font-bold'>click here to resend</Link> (or update your email).
        </p>
        <p className='text-lg mt-8'>
            Once you have confirmed your email, you will be redirected automatically.
        </p>
      </div>
    </Page>
  );
}
