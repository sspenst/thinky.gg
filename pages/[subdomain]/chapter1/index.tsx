import { GetServerSidePropsContext } from 'next';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return {
    redirect: {
      destination: '/chapter/1',
      permanent: true,
    },
  };
}

export default function Chapter1Page() {
  return null;
}
