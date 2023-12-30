import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import React from 'react';
import ResetPasswordForm from '../../../../components/forms/resetPasswordForm';
import Page from '../../../../components/page/page';
import redirectToHome from '../../../../helpers/redirectToHome';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return await redirectToHome(context);
}

/* istanbul ignore next 
// Newline placeholder needed for swc: https://github.com/swc-project/jest/issues/119#issuecomment-1872581999
*/
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
