import React, { useEffect, useState } from 'react';
import Page from '../components/page';
import Select from '../components/select';
import SelectOption from '../models/selectOption';
import WelcomeModal from '../components/modal/welcomeModal';
import useUser from '../hooks/useUser';

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    if (user && user.score === 0) {
      setIsOpen(true);
    }
  }, [user]);

  return (
    <Page title={'Pathology'}>
      <>
        <Select options={[
          new SelectOption('Play', '/catalog'),
          new SelectOption('Leaderboard', '/leaderboard'),
        ]}/>
        <WelcomeModal closeModal={() => setIsOpen(false)} isOpen={isOpen}/>
      </>
    </Page>
  );
}
