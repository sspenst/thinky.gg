import { GetServerSidePropsContext } from 'next';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return {
    redirect: {
      destination: '/chapter/3',
      permanent: true,
    },
  };
}

export default function Chapter3Page() {
  return null;
}
