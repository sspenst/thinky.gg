import { GetServerSidePropsContext } from 'next';
import LoginForm from '../../../components/forms/loginForm';
import Page from '../../../components/page/page';
import redirectToHome from '../../../helpers/redirectToHome';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return await redirectToHome(context);
}

/* istanbul ignore next */
export default function Login() {
  return (
    <Page title={'Log In'}>
      <LoginForm />
    </Page>
  );
}
