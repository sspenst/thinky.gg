import React, { useContext, useEffect, useState } from 'react';
import Theme from '../../constants/theme';
import { AppContext } from '../../contexts/appContext';
import RadioButton from '../radioButton';
import Modal from '.';

interface ThemeModalProps {
  closeModal: () => void;
  isOpen: boolean;
}

export default function ThemeModal({ closeModal, isOpen }: ThemeModalProps) {
  const { forceUpdate, mutateUser } = useContext(AppContext);
  const [theme, setTheme] = useState<string>();

  useEffect(() => {
    for (const className of document.body.classList.values()) {
      if (className.startsWith('theme-')) {
        setTheme(className);

        return;
      }
    }
  }, [isOpen]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTheme = e.currentTarget.value;

    if (theme !== undefined) {
      document.body.classList.remove(theme);
    }

    document.body.classList.add(newTheme);
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
      mutateUser();
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
              key={`theme-${Theme[themeText]}`}
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
