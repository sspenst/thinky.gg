import Page from '@root/components/page/page';
import React from 'react';

export default function Custom404() {
  return (
    <Page title='Pathology'>
      <div className='flex flex-col items-center gap-4 py-24 px-4'>
        <h2 className='text-2xl font-medium'>
          404
        </h2>
        <span>
          Page Not Found
        </span>
      </div>
    </Page>
  );
}
