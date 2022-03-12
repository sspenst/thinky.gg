import Link from 'next/link';
import Page from '../components/page';
import React from 'react';

export default function App() {
  return (
    <Page title={'Pathology'}>
      <>
        <div><Link href='/catalog'>CATALOG</Link></div>
        <div><Link href='/leaderboard'>LEADERBOARD</Link></div>
      </>
    </Page>
  );
}
