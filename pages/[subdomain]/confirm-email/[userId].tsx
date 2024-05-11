import Page from '@root/components/page/page';
import User from '@root/models/db/user';
import { UserModel } from '@root/models/mongoose';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { toast } from 'react-hot-toast';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { token, userId } = context.query;
  const decodedToken = typeof token === 'string' ? decodeURIComponent(token) : null;

  const user = await UserModel.findOneAndUpdate<User>(
    {
      emailConfirmationToken: decodedToken,
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

  const emailConfirmed = !!user?.emailConfirmed;

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
        router.push('/settings');
      } else {
        toast.success('Email confirmed!');
        router.push('/');
      }
    }, 1000);

    return () => {
      clearTimeout(ts);
    };
  }, [emailConfirmed, router]);

  return (
    <Page title={'Confirm Email'}>

      <div className='flex flex-col items-center gap-4 py-24 px-4'>
        <h2 className='text-2xl font-medium'>
          Email is {emailConfirmed ? 'confirmed' : 'not confirmed'}
        </h2>
        <span>
          Redirecting...
        </span>
      </div>
    </Page>
  );
}
