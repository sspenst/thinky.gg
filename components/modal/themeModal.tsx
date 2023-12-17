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
  const { game, mutateUser, userConfig } = useContext(AppContext);
  const { setTheme, theme } = useTheme();

  // override theme with userConfig theme
  useEffect(() => {
    if (!userConfig?.theme) {
      return;
    }

    if (Object.values(Theme).includes(userConfig.theme as Theme) && theme !== userConfig.theme) {
      setTheme(userConfig.theme);
    }
  // NB: we only want this to run when the userConfig changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userConfig?.theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme-dark', theme === Theme.Light ? 'false' : 'true');
  }, [theme]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTheme = e.currentTarget.value as Theme;

    setTheme(newTheme);
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
      <div className='flex flex-col gap-1'>
        {Object.keys(Theme).map(themeTextStr => {
          const themeText = themeTextStr as keyof typeof Theme;
          const icon = getIconFromTheme(game, Theme[themeText], TileType.Start);
          const id = `theme-${Theme[themeText]}`;

          return (
            <div className='flex gap-2' key={`${Theme[themeText]}-parent-div`}>
              <input
                checked={theme === Theme[themeText]}
                id={id}
                onChange={onChange}
                type='radio'
                value={Theme[themeText]}
              />
              <label htmlFor={id}>
                {themeText}
              </label>
              {icon &&
                <span>
                  {icon({ size: 24 } as ThemeIconProps)}
                </span>
              }
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
