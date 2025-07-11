import { GetServerSidePropsContext } from 'next';
import ForgotPasswordForm from '../../../components/forms/forgotPasswordForm';
import Page from '../../../components/page/page';
import redirectToHome from '../../../helpers/redirectToHome';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return await redirectToHome(context);
}

/* istanbul ignore next */
export default function ForgotPassword() {
  return (
    <Page title={'Forgot Password'}>
      <ForgotPasswordForm />
    </Page>
  );
}
