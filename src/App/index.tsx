import React from 'react';
import { Link } from 'react-router-dom';
import Page from '../Common/Page';
import UserState from './UserState';

export default function App() {
  return (
    <Page title={'Pathology'}>
      <>
        <div><Link to='/catalog'>CATALOG</Link></div>
        <div><Link to='/leaderboard'>LEADERBOARD</Link></div>
        {/* <div><Link to='/data'>DATA</Link></div>
        <div><Link to='/editor'>EDITOR</Link></div> */}
        <UserState/>
      </>
    </Page>
  );
}
