import Page from '../components/page';
import React from 'react';
import Select from '../components/select';
import SelectOption from '../models/selectOption';

export default function App() {
  return (
    <Page title={'Pathology'}>
      <Select options={[
        new SelectOption('Play', '/catalog'),
        new SelectOption('Leaderboard', '/leaderboard'),
      ]}/>
    </Page>
  );
}
