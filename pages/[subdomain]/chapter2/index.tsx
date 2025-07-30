import { GetServerSidePropsContext } from 'next';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return {
    redirect: {
      destination: '/chapter/2',
      permanent: true,
    },
  };
}

export default function Chapter2Page() {
  return null;
}
