import Page from '@root/components/page/page';
import { AppContext } from '@root/contexts/appContext';
import { ErrorProps } from 'next/error';
import React, { useContext } from 'react';

export default function CustomError({ statusCode }: ErrorProps) {
  const { game } = useContext(AppContext);

  return (
    <Page title={game.displayName}>
      <div className='flex flex-col items-center gap-4 py-24 px-4'>
        <h2 className='text-2xl font-medium'>
          {statusCode ? statusCode : 'Error'}
        </h2>
        <span>
          {`A ${statusCode ? 'server' : 'client'}-side error occurred.`}
        </span>
        <span>
          Please report the issue on <a className='hover:underline text-blue-500' href='https://discord.com/channels/971585343956590623/975382809642430504' rel='noreferrer' target='_blank'>Discord</a>, create an issue on <a className='hover:underline text-blue-500' href='https://github.com/sspenst/pathology/issues' rel='noreferrer' target='_blank'>GitHub</a>, or contact <a className='hover:underline text-blue-500' href='mailto:help@thinky.gg' rel='noreferrer' target='_blank'>help@thinky.gg</a>.
        </span>
      </div>
    </Page>
  );
}
