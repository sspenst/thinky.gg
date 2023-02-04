import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React from 'react';
import ChapterSelectCard from '../../components/chapterSelectCard';
import Page from '../../components/page';
import { getUserFromToken } from '../../lib/withAuth';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {};
}

/* istanbul ignore next */
export default function PlayPage() {
  return (
    <Page title={'Pathology Official Campaign'}>
      <div className='flex flex-col items-center gap-8 p-4'>
        <div className='font-bold text-3xl text-center'>
          Pathology Official Campaign
        </div>
        <ChapterSelectCard
          disabled={false}
          href={'/chapter1'}
          levelData={'00000000\n00000000\n00000000\n00000000'}
          subtitle={'Grassroots'}
          title={'Chapter 1'}
        />
        <ChapterSelectCard
          disabled={false}
          href={'/chapter2'}
          levelData={'005E0C00\n0G070005\n10005010\n005100I0'}
          subtitle={'Into the Depths'}
          title={'Chapter 2'}
        />
        <ChapterSelectCard
          disabled={false}
          href={'/chapter3'}
          levelData={'B519F0G0\n00JH5H52\n75F02J08\n02050B10'}
          subtitle={'Brain Busters'}
          title={'Chapter 3'}
        />
      </div>
    </Page>
  );
}
