import TileType from '@root/constants/tileType';
import isPro from '@root/helpers/isPro';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Theme, { getIconFromTheme } from '../../constants/theme';
import { AppContext } from '../../contexts/appContext';
import { ThemeIconProps } from '../theme/monkey';
import Modal from '.';
import ImportThemeModal from './importThemeModal';

const varLabelMap = {
  '--bg-color': 'Background',
  '--bg-color-2': 'Background 2',
  '--bg-color-3': 'Background 3',
  '--bg-color-4': 'Background 4',
  '--color': 'Text',
  '--color-complete': 'Complete',
  '--color-error': 'Error',
  '--color-gray': 'Gray',
  '--color-incomplete': 'Incomplete',
  '--level-block': 'Level Block',
  '--level-block-border': 'Level Block Border',
  '--level-end': 'Level End',
  '--level-grid': 'Level Grid',
  '--level-grid-text': 'Level Grid Text',
  '--level-grid-used': 'Level Grid Used',
  '--level-hole': 'Level Hole',
  '--level-hole-border': 'Level Hole Border',
  '--level-player': 'Level Player',
  '--level-player-extra': 'Level Player Extra',
  '--level-player-text': 'Level Player Text',
  '--level-wall': 'Level Wall',
} as Record<string, string>;

function getCssPropertyHex(property: string) {
  const tempDiv = document.createElement('div');

  tempDiv.style.color = getComputedStyle(document.documentElement).getPropertyValue(property).trim();
  document.body.appendChild(tempDiv);

  const colorRgb = getComputedStyle(tempDiv).color;

  document.body.removeChild(tempDiv);

  const nums = colorRgb.match(/\d+/g);

  if (!nums || nums.length < 3) {
    return '#000000';
  }

  const [r, g, b] = nums.map(n => {
    let hex = Number(n).toString(16);

    if (hex.length === 1) {
      hex = '0' + hex;
    }

    return hex;
  });

  return `#${r}${g}${b}`;
}

interface ThemeModalProps {
  closeModal: () => void;
  isOpen: boolean;
}

export default function ThemeModal({ closeModal, isOpen }: ThemeModalProps) {
  const [customColors, setCustomColors] = useState<Record<string, string>>({});
  const { game, mutateUser, user, userConfig } = useContext(AppContext);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const { setTheme, theme } = useTheme();
  const [activeTab, setActiveTab] = useState(theme === Theme.Custom ? 'Custom' : 'Presets');
  const isProUser = isPro(user);

  // override theme with userConfig theme
  useEffect(() => {
    if (!userConfig?.theme) {
      return;
    }

    // use the userConfig custom theme if it exists, otherwise init with the current css variables
    const customTheme = userConfig?.customTheme ? JSON.parse(userConfig.customTheme) : {};
    const initCustomColors = {} as Record<string, string>;

    for (const key of Object.keys(varLabelMap)) {
      let value = getCssPropertyHex(key);

      if (customTheme[key]) {
        value = customTheme[key];
      }

      if (userConfig.theme === Theme.Custom) {
        document.documentElement.style.setProperty(key, value);
      }

      initCustomColors[key] = value;
    }

    setCustomColors(initCustomColors);

    if (Object.values(Theme).includes(userConfig.theme as Theme) && theme !== userConfig.theme) {
      setTheme(userConfig.theme);
    }
  // NB: we only want this to run when the userConfig changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userConfig?.customTheme, userConfig?.theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme-dark', theme === Theme.Light ? 'false' : 'true');
  }, [theme]);

  // set theme while handling custom theme style properties
  function setThemeWrapper(theme: Theme) {
    if (theme === Theme.Custom) {
      for (const key of Object.keys(varLabelMap)) {
        document.documentElement.style.setProperty(key, customColors[key]);
      }
    } else {
      for (const key of Object.keys(varLabelMap)) {
        document.documentElement.style.removeProperty(key);
      }
    }

    setTheme(theme);
  }

  function putTheme() {
    fetch('/api/user-config', {
      method: 'PUT',
      body: JSON.stringify({
        customTheme: isProUser ? JSON.stringify(customColors) : undefined,
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

  const updateColor = (key: string, value: string) => {
    setCustomColors(prevCustomColors => {
      const newCustomColors = { ...prevCustomColors };

      newCustomColors[key] = value;
      document.documentElement.style.setProperty(key, value);

      return newCustomColors;
    });
  };

  return (
    <Modal
      closeModal={() => {
        closeModal();
        putTheme();
      }}
      isOpen={isOpen}
      title='Theme'
    >
      <div className='flex flex-col gap-4'>
        {isProUser &&
          <div className='flex justify-center gap-2'>
            <button
              className={`px-3 py-1.5 rounded-md tab ${activeTab === 'Presets' ? 'bg-2' : 'bg-1'} focus:outline-none`}
              onClick={() => setActiveTab('Presets')}
            >
              Presets
            </button>
            <button
              className={`px-3 py-1.5 rounded-md tab ${activeTab === 'Custom' ? 'bg-2' : 'bg-1'} focus:outline-none`}
              onClick={() => {
                setThemeWrapper(Theme.Custom);
                setActiveTab('Custom');
              }}
            >
              <div className='flex gap-2'>
                Custom
              </div>
            </button>
          </div>
        }
        {activeTab === 'Presets' &&
          <div className='flex flex-col gap-1'>
            {Object.keys(Theme).map(themeTextStr => {
              const themeText = themeTextStr as keyof typeof Theme;
              const icon = getIconFromTheme(game, Theme[themeText], TileType.Player);
              const id = `theme-${Theme[themeText]}`;
              const isProTheme = Theme[themeText] === Theme.Custom;

              return (
                <div className='flex items-center gap-2' key={`${Theme[themeText]}-parent-div`}>
                  <input
                    checked={theme === Theme[themeText]}
                    disabled={isProTheme && !isProUser}
                    id={id}
                    onChange={e => setThemeWrapper(e.currentTarget.value as Theme)}
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
                  {isProTheme && !isProUser &&
                    <Link href='/pro'>
                      <Image alt='pro' src='/pro.svg' width={16} height={16} style={{ minWidth: 16, minHeight: 16 }} />
                    </Link>
                  }
                </div>
              );
            })}
          </div>
        }
        {activeTab === 'Custom' &&
          <div className='max-h-[350px] overflow-y-auto px-3 flex flex-col gap-2'>
            {Object.keys(customColors).map((key) => (
              <div key={key} className='flex items-center justify-between'>
                <label className='mr-2'>{varLabelMap[key]}</label>
                <input
                  className='border-0 p-0'
                  onChange={(e) => updateColor(key, e.target.value)}
                  type='color'
                  value={customColors[key]}
                />
              </div>
            ))}
          </div>
        }
        {isProUser &&
          <div className='flex justify-center text-sm gap-3'>
            <button
              className='bg-blue-500 hover:bg-blue-700 text-white rounded-md px-3 py-2 w-fit'
              onClick={() => {
                const currentColors = {} as Record<string, string>;

                for (const key of Object.keys(varLabelMap)) {
                  currentColors[key] = getCssPropertyHex(key);
                }

                navigator.clipboard.writeText(JSON.stringify(currentColors));
                toast.dismiss();
                toast.success('Copied theme to clipboard!');
              }}
            >
              Export
            </button>
            <button
              className='bg-blue-500 hover:bg-blue-700 text-white rounded-md px-3 py-2 w-fit'
              onClick={() => setIsImportOpen(true)}
            >
              Import
            </button>
            <ImportThemeModal
              closeModal={() => setIsImportOpen(false)}
              isOpen={isImportOpen}
              onSubmit={(data) => {
                try {
                  const newSettings = JSON.parse(data);

                  for (const key in newSettings) {
                    if (varLabelMap[key]) {
                      const color = newSettings[key];

                      // make sure this is a color
                      if (!color.match(/^#[0-9A-Fa-f]{6}$/i)) {
                        throw new Error('Invalid color');
                      }

                      updateColor(key, newSettings[key]);
                    }
                  }

                  setTheme(Theme.Custom);
                  setActiveTab('Custom');

                  toast.success('Imported theme successfully');
                } catch {
                  toast.error('Invalid theme');
                }
              }}
            />
          </div>
        }
      </div>
    </Modal>
  );
}
