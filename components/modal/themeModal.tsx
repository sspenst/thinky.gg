import React, { useContext, useEffect, useState } from 'react';
import Modal from '.';
import { PageContext } from '../../contexts/pageContext';
import RadioButton from '../radioButton';

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
        <RadioButton
          currentValue={theme}
          name={'theme'}
          onChange={onChange}
          text={'Classic'}
          value={'theme-classic'}
        />
        <RadioButton
          currentValue={theme}
          name={'theme'}
          onChange={onChange}
          text={'Dark'}
          value={'theme-dark'}
        />
        <RadioButton
          currentValue={theme}
          name={'theme'}
          onChange={onChange}
          text={'High Contrast'}
          value={'theme-high-contrast'}
        />
        <RadioButton
          currentValue={theme}
          name={'theme'}
          onChange={onChange}
          text={'Light'}
          value={'theme-light'}
        />
        <RadioButton
          currentValue={theme}
          name={'theme'}
          onChange={onChange}
          text={'Modern'}
          value={'theme-modern'}
        />
      </>
    </Modal>
  );
}
