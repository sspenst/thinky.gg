import TileType from '@root/constants/tileType';
import isPro from '@root/helpers/isPro';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Theme, { getIconFromTheme } from '../../constants/theme';
import { AppContext } from '../../contexts/appContext';
import { ThemeIconProps } from '../theme/monkey';
import Modal from '.';

interface ThemeModalProps {
  closeModal: () => void;
  isOpen: boolean;
}

const ColorPicker = ({ label, colorVar, onChange }: { label: string, colorVar: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
  return (
    <div className='flex items-center justify-between my-2'>
      <label className='mr-2'>{label}</label>
      <input type='color' value={colorVar} onChange={onChange} />
    </div>
  );
};

export default function ThemeModal({ closeModal, isOpen }: ThemeModalProps) {
  const { user, game, mutateUser, userConfig } = useContext(AppContext);
  const { setTheme, theme } = useTheme();
  const [activeTab, setActiveTab] = useState('Theme');
  const rgbToHex = (rgb: string) => {
    if (!rgb) return '#000000'; // Default color
    // if already in hex format, return
    if (rgb.indexOf('#') === 0) return rgb;

    const [r, g, b] = rgb.match(/\d+/g)?.map(Number) || [];

    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };
  const toggleTab = (tabName: string) => {
    setActiveTab(tabName);
  };

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

    if (newTheme === Theme.Custom) {
      if (!isPro(user)) {
        toast.error('Custom themes are a pro feature');

        return;
      }

      if (user?.config.customTheme === undefined || user?.config?.customTheme?.length === 0) {
        toast.error('You must set a custom theme first');

        return;
      }

      const customTheme = JSON.parse(user.config.customTheme);

      for (const key of Object.keys(customTheme)) {
        document.documentElement.style.setProperty(key, customTheme[key]);
      }
    } else {
      // clear custom theme
      if (user?.config.customTheme !== undefined ) {
        const customTheme = JSON.parse(user.config.customTheme);

        for (const key of Object.keys(customTheme)) {
          document.documentElement.style.removeProperty(key);
        }
      }
    }

    setTheme(newTheme);
  }

  function putTheme(customTheme?: string) {
    const isCustomTheme = customTheme !== undefined;

    fetch('/api/user-config', {
      method: 'PUT',
      body: JSON.stringify({
        customTheme: isCustomTheme ? customTheme : undefined,
        theme: isCustomTheme ? Theme.Custom : theme,
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

  // Function to fetch current CSS variable value in Hex format
  const getCssVariableValue = (varName: string) => {
    const rgbValue = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

    return rgbToHex(rgbValue);
  };
  const [colorSettings, setColorSettings] = useState([
    { label: 'Background Color', varName: '--bg-color', value: getCssVariableValue('--bg-color') },
    { label: 'Background Color 2', varName: '--bg-color-2', value: getCssVariableValue('--bg-color-2') },
    { label: 'Background Color 3', varName: '--bg-color-3', value: getCssVariableValue('--bg-color-3') },
    { label: 'Background Color 4', varName: '--bg-color-4', value: getCssVariableValue('--bg-color-4') },
    { label: 'Text Color', varName: '--color', value: getCssVariableValue('--color') },
    { label: 'Error Color', varName: '--color-error', value: getCssVariableValue('--color-error') },
    { label: 'Gray Color', varName: '--color-gray', value: getCssVariableValue('--color-gray') },
    { label: 'Incomplete Color', varName: '--color-incomplete', value: getCssVariableValue('--color-incomplete') },
    { label: 'Level Block Color', varName: '--level-block', value: getCssVariableValue('--level-block') },
    { label: 'Level Block Border Color', varName: '--level-block-border', value: getCssVariableValue('--level-block-border') },
    { label: 'Level End Color', varName: '--level-end', value: getCssVariableValue('--level-end') },
    { label: 'Level Grid Color', varName: '--level-grid', value: getCssVariableValue('--level-grid') },
    { label: 'Level Grid Text Color', varName: '--level-grid-text', value: getCssVariableValue('--level-grid-text') },
    { label: 'Level Grid Used Color', varName: '--level-grid-used', value: getCssVariableValue('--level-grid-used') },
    { label: 'Level Hole Color', varName: '--level-hole', value: getCssVariableValue('--level-hole') },
    { label: 'Level Hole Border Color', varName: '--level-hole-border', value: getCssVariableValue('--level-hole-border') },
    { label: 'Level Player Color', varName: '--level-player', value: getCssVariableValue('--level-player') },
    { label: 'Level Player Extra Color', varName: '--level-player-extra', value: getCssVariableValue('--level-player-extra') },
    { label: 'Level Player Text Color', varName: '--level-player-text', value: getCssVariableValue('--level-player-text') },
    { label: 'Level Wall Color', varName: '--level-wall', value: getCssVariableValue('--level-wall') },
  ]);

  useEffect(() => {
    if (activeTab !== 'Customize') return;
    // set the color settings to the current values
    const newSettings = [...colorSettings];

    for (const setting of colorSettings) {
      const index = colorSettings.findIndex(i => i.varName === setting.varName);

      newSettings[index].value = getCssVariableValue(setting.varName);
    }

    setColorSettings(newSettings);
  }, [activeTab]);

  const updateColor = (index: number, colorValue: string) => {
    const newSettings = [...colorSettings];

    newSettings[index].value = colorValue;
    setColorSettings(newSettings);
    document.documentElement.style.setProperty(newSettings[index].varName, colorValue);
  };
  const proUser = isPro(user);

  const getCustomThemeCode = () => {
    const kv = {} as Record<string, string>;

    colorSettings.forEach(i => {
      kv[i.varName as string] = i.value;
    });

    return JSON.stringify(kv);
  };

  return (
    <Modal
      closeModal={() => {
        closeModal();
        putTheme();
      }}
      isOpen={isOpen}
      title={'Theme'}
    >
      <div className=''>
        <div className='flex border-b mb-2'>
          <button
            className={`px-4 py-2 ${activeTab === 'Theme' ? 'bg-2' : 'bg-1'} focus:outline-none`}
            onClick={() => toggleTab('Theme')}
          >
          Theme
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'Customize' ? 'bg-2' : 'bg-1'} focus:outline-none`}
            onClick={() => toggleTab('Customize')}
          >
            <div className='flex gap-1'>
              <Image alt='pro' src='/pro.svg' width={16} height={16} style={{ minWidth: 16, minHeight: 16 }} />
          Customize
            </div>
          </button>
        </div>
        {activeTab === 'Theme' && (
          <div className='flex flex-col gap-1'>
            {Object.keys(Theme).map(themeTextStr => {
              const themeText = themeTextStr as keyof typeof Theme;
              const icon = getIconFromTheme(game, Theme[themeText], TileType.Player);
              const id = `theme-${Theme[themeText]}`;

              const isProTheme = Theme[themeText] === Theme.Custom;

              return (
                <div className='flex gap-2' key={`${Theme[themeText]}-parent-div`}>
                  <input
                    disabled={(isProTheme && !proUser) || (isProTheme && proUser && user?.config.customTheme === undefined || user?.config?.customTheme?.length === 0)}
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
                  {isProTheme && <Image alt='pro' src='/pro.svg' width={16} height={16} style={{ minWidth: 16, minHeight: 16 }} />}
                </div>
              );
            })}
          </div>
        )}
        {activeTab === 'Customize' && (
          <div className='customize-content overflow-y-auto'>
            <div className='flex justify-around min-w-80 text-sm gap-3 p-3'>
              <details>
                <summary className='bg-white text-black rounded-md px-2 py-1'>Export</summary>
                <textarea id='custonize-content' className='w-full h-20 bg-black text-white text-xs' value={getCustomThemeCode()} readOnly />
                <button
                  className='bg-blue-700 text-white rounded-md px-2 py-1'
                  onClick={() => {
                    const el = document.querySelector('.customize-content textarea') as HTMLTextAreaElement;

                    el.select();
                    document.execCommand('copy');
                    toast.success('Copied theme to clipboard');
                  }}
                > Copy </button>
              </details>
              <details>
                <summary className='bg-white text-black rounded-md px-2 py-1'>Import</summary>
                <textarea
                  className='w-full h-20 bg-white-text-black text-xs'
                  placeholder='Paste exported theme here'
                />
                <button
                  className='bg-blue-700 text-white rounded-md px-2 py-1'
                  onClick={() => {
                    if (confirm('Are you sure you want to import this theme? This will override your current theme.'))
                      try {
                        const el = document.querySelector('.customize-content textarea') as HTMLTextAreaElement;
                        const newSettings = JSON.parse(el?.value || '');

                        // only include settings that are in the colorSettings label
                        for (const key in newSettings) {
                          if (colorSettings.find(i => i.varName === key)) {
                            newSettings[key] = newSettings[key].toUpperCase();
                          } else {
                            delete newSettings[key];
                          }
                        }

                        for (const setting of colorSettings) {
                          const index = colorSettings.findIndex(i => i.varName === setting.varName);

                          // make sure this is a color
                          if (!setting.value.match(/^#[0-9A-F]{6}$/i)) {
                            throw new Error('Invalid color');
                          }

                          updateColor(index, setting.value);
                        }

                        toast.success('Imported theme successfully');
                      } catch (e) {
                        toast.error('Invalid theme');
                      }
                  }}
                > Import </button>
              </details>
            </div>
            <div className='max-h-[350px] overflow-y-auto p-3'>
              {colorSettings.map((setting, index) => (
                <div key={setting.varName} className='flex items-center justify-between my-2'>
                  <label className='mr-2'>{setting.label}</label>
                  <input
                    type='color'
                    value={setting.value}
                    onChange={(e) => updateColor(index, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className='flex mt-3'>
              { /** save button */}
              <button
                className='bg-blue-700 text-white rounded-md px-2 py-1 w-full'
                onClick={() => {
                  putTheme(getCustomThemeCode());
                  toast.success('Saved theme');
                }}
              > Save </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
