import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import React from 'react';
import Page from '../../../components/page';
import ResetPasswordForm from '../../../components/resetPasswordForm';
import redirectToHome from '../../../helpers/redirectToHome';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return await redirectToHome(context);
}

/* istanbul ignore next */
export default function ResetPassword() {
  const router = useRouter();
  const { token, userId } = router.query;

  return (typeof token !== 'string' || typeof userId !== 'string' ? null :
    <Page title={'Reset Password'}>
      <ResetPasswordForm
        token={token}
        userId={userId}
      />
    </Page>
  );
}
