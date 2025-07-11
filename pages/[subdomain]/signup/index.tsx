import SignupForm from '@root/components/forms/signupForm';
import { getUserFromToken } from '@root/lib/withAuth';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Page from '../../../components/page/page';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (reqUser) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {
      recaptchaPublicKey: process.env.RECAPTCHA_PUBLIC_KEY ?? null,
    },
  };
}

interface SignUpProps {
  recaptchaPublicKey: string | null;
}

/* istanbul ignore next */
export default function SignUp({ recaptchaPublicKey }: SignUpProps) {
  return (
    <Page title='Sign Up'>
      <SignupForm recaptchaPublicKey={recaptchaPublicKey} />
    </Page>
  );
}
