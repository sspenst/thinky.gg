import React, { useContext, useEffect, useState } from 'react';
import Modal from '.';
import { PageContext } from '../../contexts/pageContext';

interface ThemeModalProps {
  closeModal: () => void;
  isOpen: boolean;
}

export default function ThemeModal({ closeModal, isOpen }: ThemeModalProps) {
  const { forceUpdate } = useContext(PageContext);
  const [theme, setTheme] = useState<string>();

  useEffect(() => {
    setTheme(document.body.className);
  }, []);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTheme = e.currentTarget.value;
    document.body.className = newTheme;
    setTheme(newTheme);
    forceUpdate();
  }

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={'Theme'}
    >
      <>
        <input
          checked={theme === 'theme-classic'}
          name='theme'
          onChange={onChange}
          style={{
            margin: '0px 10px',
          }}
          type='radio'
          value='theme-classic'
        />
        CLASSIC
        <input
          checked={theme === 'theme-light'}
          name='theme'
          onChange={onChange}
          style={{
            margin: '0px 10px',
          }}
          type='radio'
          value='theme-light'
        />
        LIGHT
        <input
          checked={theme === 'theme-modern'}
          name='theme'
          onChange={onChange}
          style={{
            margin: '0px 10px',
          }}
          type='radio'
          value='theme-modern'
        />
        MODERN
      </>
    </Modal>
  );
}
