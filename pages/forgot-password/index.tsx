/* istanbul ignore file */

import React from 'react';
import ForgotPasswordForm from '../../components/forgotPasswordForm';
import Page from '../../components/page';

export default function ForgotPassword() {
  return (
    <Page title={'Forgot Password'}>
      <ForgotPasswordForm />
    </Page>
  );
}
