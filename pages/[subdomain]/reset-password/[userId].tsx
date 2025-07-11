import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import ResetPasswordForm from '../../../components/forms/resetPasswordForm';
import Page from '../../../components/page/page';
import redirectToHome from '../../../helpers/redirectToHome';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return await redirectToHome(context);
}

/* istanbul ignore next */
export default function ResetPassword() {
  const router = useRouter();
  const { token, userId } = router.query;

  return (
    <Page title={'Reset Password'}>
      <ResetPasswordForm
        token={typeof token === 'string' ? decodeURIComponent(token) : null}
        userId={typeof userId === 'string' ? userId : null}
      />
    </Page>
  );
}
