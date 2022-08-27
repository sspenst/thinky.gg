/* istanbul ignore file */
/* If we ever add a getStaticProps or getServerProps then remove the ignore file and just ignore next on the default export */
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import ForgotPasswordForm from '../../components/forgotPasswordForm';
import Page from '../../components/page';

export default function ForgotPassword() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/check-token', { credentials: 'include' }).then(res => {
      if (res.status === 200) {
        router.replace('/');
      } else {
        setLoading(false);
      }
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [router]);

  return (loading ? null :
    <Page title={'Forgot Password'}>
      <ForgotPasswordForm />
    </Page>
  );
}
