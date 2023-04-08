import LevelUtil, { TileType } from '@root/constants/levelDataType';
import React, { useContext, useEffect, useState } from 'react';
import Theme, { getIconFromTheme, ICON_MAP } from '../../constants/theme';
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
        {Object.keys(Theme).map(themeTextStr => {
          const themeText = themeTextStr as keyof typeof Theme;
          const icon = getIconFromTheme(Theme[themeText], TileType.Start);

          return (
            <div key={`theme-${Theme[themeText]}-parent-div`} className='flex flex-row'>
              <div><RadioButton
                currentValue={theme}
                key={`theme-${Theme[themeText]}`}
                name={'theme'}
                onChange={onChange}
                text={themeText}
                value={Theme[themeText]}
              />
              </div>
              <span className='ml-2 w-6 h-6'>
                {icon && icon({
                  size: 24
                } as any)}
              </span>
            </div>
          );
        })}
      </>
    </Modal>
  );
}
