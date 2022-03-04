import React from 'react';
import Link from 'next/link';
import Page from '../components/Common/Page';
import UserState from './UserState';

export default function App() {
  return (
    <Page needsAuth={true} title={'Pathology'}>
      <>
        <div><Link href='/catalog'>CATALOG</Link></div>
        <div><Link href='/leaderboard'>LEADERBOARD</Link></div>
        {/* <div><Link to='/data'>DATA</Link></div>
        <div><Link to='/editor'>EDITOR</Link></div> */}
        <UserState/>
      </>
    </Page>
  );
}
