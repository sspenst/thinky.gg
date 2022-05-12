import React, { useCallback } from 'react';
import Dimensions from '../constants/dimensions';
import Link from 'next/link';
import Page from '../components/page';
import Select from '../components/select';
import SelectOption from '../models/selectOption';
import useUser from '../hooks/useUser';

export default function App() {
  const { isLoading, user } = useUser();

  const getOptions = useCallback(() => {
    return user ? [
      new SelectOption('Play', '/catalog'),
      new SelectOption('Create', '/create'),
      new SelectOption('Leaderboard', '/leaderboard'),
    ] : [
      new SelectOption('Play', '/catalog'),
      new SelectOption('Leaderboard', '/leaderboard'),
    ];
  }, [user]);

  return (
    <Page title={'Pathology'}>
      <>
        <div
          style={{
            margin: Dimensions.TableMargin,
            textAlign: 'center',
          }}
        >
          {'Welcome to Pathology! If you are a returning Psychopath player feel free to jump in and browse the full catalog of levels, but if you are new to the game the best way to start is with the '}
          <Link href={`/world/61ff23c45125afd1d9c0fc4c`} passHref>
            <a className='font-bold underline'>
              Psychopath Tutorial
            </a>
          </Link>
          {'. If you get stuck or want to discuss anything related to Pathology, join the community on the '}
          <a
            className='font-bold underline'
            href='https://discord.gg/j6RxRdqq4A'
            rel='noreferrer'
            target='_blank'
          >
            k2xl Discord
          </a>
          {'. Have fun!'}
        </div>
        {!isLoading ? <Select options={getOptions()}/> : null}
      </>
    </Page>
  );
}
