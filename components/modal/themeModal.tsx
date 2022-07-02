import React, { useContext, useEffect, useState } from 'react';
import Modal from '.';
import { PageContext } from '../../contexts/pageContext';
import RadioButton from '../radioButton';
import Theme from '../../constants/theme';

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
        {Object.keys(Theme).map(themeText => {
          return (
            <RadioButton
              currentValue={theme}
              key={Theme[themeText]}
              name={'theme'}
              onChange={onChange}
              text={themeText}
              value={Theme[themeText]}
            />
          );
        })}
      </>
    </Modal>
  );
}
