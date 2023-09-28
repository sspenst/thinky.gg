import RadioButton from '@root/components/page/radioButton';
import TileType from '@root/constants/tileType';
import { useTheme } from 'next-themes';
import React, { useContext, useEffect } from 'react';
import Theme, { getIconFromTheme } from '../../constants/theme';
import { AppContext } from '../../contexts/appContext';
import { ThemeIconProps } from '../theme/monkey';
import Modal from '.';

interface ThemeModalProps {
  closeModal: () => void;
  isOpen: boolean;
}

export default function ThemeModal({ closeModal, isOpen }: ThemeModalProps) {
  const { mutateUser, setTheme, theme } = useContext(AppContext);
  const { setTheme: setAppTheme } = useTheme();

  useEffect(() => {
    for (const className of document.body.classList.values()) {
      if (className.startsWith('theme-')) {
        setTheme(className);
        setAppTheme(className === Theme.Light ? 'light' : 'dark');

        return;
      }
    }
  }, [isOpen, setAppTheme, setTheme]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTheme = e.currentTarget.value;

    if (theme !== undefined) {
      document.body.classList.remove(theme);
    }

    document.body.classList.add(newTheme);
    setTheme(newTheme);
    setAppTheme(newTheme === Theme.Light ? 'light' : 'dark');
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
        {Object.keys(Theme).map(themeTextStr => {
          const themeText = themeTextStr as keyof typeof Theme;
          const icon = getIconFromTheme(Theme[themeText], TileType.Start);

          return (
            <div key={`${Theme[themeText]}-parent-div`} className='flex flex-row'>
              <div>
                <RadioButton
                  currentValue={theme}
                  key={`${Theme[themeText]}`}
                  name={'theme'}
                  onChange={onChange}
                  text={themeText}
                  value={Theme[themeText]}
                />
              </div>
              <span className='ml-2 w-6 h-6'>
                {icon && icon({
                  size: 24
                } as ThemeIconProps)}
              </span>
            </div>
          );
        })}
      </>
    </Modal>
  );
}
