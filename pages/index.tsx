import React, { useCallback, useEffect, useState } from 'react';
import Page from '../components/page';
import Select from '../components/select';
import SelectOption from '../models/selectOption';
import WelcomeModal from '../components/modal/welcomeModal';
import useUser from '../hooks/useUser';

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const { isLoading, user } = useUser();

  useEffect(() => {
    if (user && user.score === 0) {
      setIsOpen(true);
    }
  }, [user]);

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
        {!isLoading ? <Select options={getOptions()}/> : null}
        <WelcomeModal closeModal={() => setIsOpen(false)} isOpen={isOpen}/>
      </>
    </Page>
  );
}
