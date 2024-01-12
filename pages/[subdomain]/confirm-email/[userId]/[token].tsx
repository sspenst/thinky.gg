import Page from '@root/components/page/page';
import { getUserFromToken } from '@root/lib/withAuth';
import User from '@root/models/db/user';
import { UserModel } from '@root/models/mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { toast } from 'react-hot-toast';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { userId, token } = context.query;
  let emailConfirmed = false;

  const user = await UserModel.findOneAndUpdate<User>(
    {
      emailConfirmationToken: token,
      _id: userId,
    },
    {
      emailConfirmationToken: null,
      emailConfirmed: true,
    },
    {
      new: true,
      projection: {
        emailConfirmationToken: 1,
        emailConfirmed: 1,
      },
    },
  );

  emailConfirmed = !!user?.emailConfirmed;

  return {
    props: {
      emailConfirmed: emailConfirmed,
    },
  };
}

interface ConfirmEmailProps {
  emailConfirmed: boolean;
}

/* istanbul ignore next */
export default function ConfirmEmail({ emailConfirmed }: ConfirmEmailProps) {
  const router = useRouter();

  useEffect(() => {
    toast.dismiss();
    const ts = setTimeout(() => {
      if (!emailConfirmed) {
        toast.error('Email confirmation failed. Please try again');
        router.push('/settings/account');
      } else {
        toast.success('Email confirmed!');
        router.push('/');
      }
    }, 100);

    return () => {
      clearTimeout(ts);
    };
  }, [emailConfirmed, router]);

  return (
    <Page title={'Confirm Email'}>
      <div className='flex flex-col items-center justify-center'>
        <h1>Email is {emailConfirmed ? 'confirmed' : 'not confirmed'}</h1>
        <span>Redirecting...</span>
      </div>
    </Page>
  );
}
