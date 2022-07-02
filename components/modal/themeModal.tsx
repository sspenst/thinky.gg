import React, { useContext, useEffect, useState } from 'react';
import Modal from '.';
import { PageContext } from '../../contexts/pageContext';
import RadioButton from '../radioButton';
import Theme from '../../constants/theme';
import useUserConfig from '../../hooks/useUserConfig';

interface ThemeModalProps {
  closeModal: () => void;
  isOpen: boolean;
}

export default function ThemeModal({ closeModal, isOpen }: ThemeModalProps) {
  const { forceUpdate } = useContext(PageContext);
  const { mutateUserConfig } = useUserConfig();
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

  function putTheme() {
    fetch('/api/user-config', {
      method: 'PUT',
      body: JSON.stringify({
        theme: theme,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(() => {
      mutateUserConfig();
    }).catch(err => {
      console.error(err);
    });
  }

  return (
    <Modal
      closeModal={() => {
        closeModal();
        putTheme();
      }}
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
