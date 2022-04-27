import React, { useEffect, useState } from 'react';
import ForgotPasswordForm from '../../components/forgotPasswordForm';
import Page from '../../components/page';
import { useRouter } from 'next/router';

export default function Login() {
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
      <ForgotPasswordForm/>
    </Page>
  );
}