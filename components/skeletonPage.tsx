import React from 'react';
import Page from './page';

interface SkeletonPageProps {
  text?: string;
}

export default function SkeletonPage({ text }: SkeletonPageProps) {
  return (
    <Page>
      <div className='m-5 text-center'>
        {text ? text : 'Loading...'}
      </div>
    </Page>
  );
}
