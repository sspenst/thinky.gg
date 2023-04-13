import Page from '@root/components/page';
import { UserConfigModel } from '@root/models/mongoose';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { toast } from 'react-hot-toast';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { userId, token } = context.query;

  const resp = await UserConfigModel.findOneAndUpdate(
    {
      userId: userId,
      emailConfirmationToken: token,
    },
    {
      emailConfirmationToken: null,
      emailConfirmed: true,
    }, {
      new: true,
    });

  if (resp?.emailConfirmed) {
    return {
      props: {
        emailConfirmed: true,
      },
    };
  } else {
    return {
      props: {
        emailConfirmed: false,
      },
    };
  }
}

export default function ConfirmEmail({ emailConfirmed }: { emailConfirmed: boolean }) {
  const router = useRouter();

  useEffect(() => {
    toast.dismiss();

    if (!emailConfirmed) {
      router.push('/settings/account');
      toast.error('Email confirmation failed!');
    } else {
      router.push('/home');
      toast.success('Email confirmed!');
    }
  }, [emailConfirmed, router]);

  return (
    <Page title={'Confirm Email'}>
      <div className='flex flex-col items-center justify-center'>
        <h1>Email is {emailConfirmed ? 'confirmed' : 'not confirmed'}</h1>
      </div>
    </Page>
  );
}
