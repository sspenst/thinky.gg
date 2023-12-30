import { GetServerSidePropsContext } from 'next';
import React from 'react';
import ForgotPasswordForm from '../../../components/forms/forgotPasswordForm';
import Page from '../../../components/page/page';
import redirectToHome from '../../../helpers/redirectToHome';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return await redirectToHome(context);
}

/* istanbul ignore next 
// Newline placeholder needed for swc: https://github.com/swc-project/jest/issues/119#issuecomment-1872581999
*/
export default function ForgotPassword() {
  return (
    <Page title={'Forgot Password'}>
      <ForgotPasswordForm />
    </Page>
  );
}
