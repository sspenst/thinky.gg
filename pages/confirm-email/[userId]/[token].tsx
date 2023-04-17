import Page from '@root/components/page';
import { getUserFromToken } from '@root/lib/withAuth';
import UserConfig from '@root/models/db/userConfig';
import { UserConfigModel } from '@root/models/mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { toast } from 'react-hot-toast';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const cookieToken = context.req?.cookies?.token;
  const reqUser = cookieToken ? await getUserFromToken(cookieToken, context.req as NextApiRequest) : null;
  const { userId, token } = context.query;
  let emailConfirmed = false;

  if (reqUser?._id.toString() === userId?.toString()) {
    const userConfig = await UserConfigModel.findOneAndUpdate<UserConfig>(
      {
        emailConfirmationToken: token,
        userId: userId,
      },
      {
        emailConfirmationToken: null,
        emailConfirmed: true,
      },
      {
        new: true,
      },
    );

    emailConfirmed = !!userConfig?.emailConfirmed;
  }

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

    if (!emailConfirmed) {
      router.push('/settings/account');
      toast.error('Email confirmation failed');
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
