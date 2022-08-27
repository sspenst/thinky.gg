/* istanbul ignore file */
/* If we ever add a getStaticProps or getServerProps then remove the ignore file and just ignore next on the default export */
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import Page from '../../../components/page';
import ResetPasswordForm from '../../../components/resetPasswordForm';

export default function ResetPassword() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { token, userId } = router.query;

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

  return (loading || typeof token !== 'string' || typeof userId !== 'string' ? null :
    <Page title={'Reset Password'}>
      <ResetPasswordForm
        token={token}
        userId={userId}
      />
    </Page>
  );
}
