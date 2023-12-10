import { Menu, Transition } from '@headlessui/react';
import Dimensions from '@root/constants/dimensions';
import { Games } from '@root/constants/Games';
import { getGameLogoAndLabel } from '@root/helpers/getGameLogo';
import useUrl from '@root/hooks/useUrl';
import Image from 'next/image';
import React, { Fragment } from 'react';

const links = Object.values(Games).map((game) => ({
  logo: game.logo,
  subdomain: game.id,
  label: game.displayName,
}));

export default function GameMenu() {
  const getUrl = useUrl();

  return (
    <Menu>
      <Menu.Button>
        <svg className='h-5 w-5 hover:opacity-70' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
          <path fillRule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clipRule='evenodd' />
        </svg>
      </Menu.Button>
      <Transition
        as={Fragment}
        enter='transition ease-out duration-100'
        enterFrom='transform opacity-0 scale-95'
        enterTo='transform opacity-100 scale-100'
        leave='transition ease-in duration-75'
        leaveFrom='transform opacity-100 scale-100'
        leaveTo='transform opacity-0 scale-95'
      >
        <Menu.Items className={'absolute m-1 w-fit origin-top-left left-0 rounded-[10px] shadow-lg border overflow-y-auto'} style={{
          backgroundColor: 'var(--bg-color-2)',
          borderColor: 'var(--bg-color-4)',
          color: 'var(--color)',
          // NB: hardcoded value accounting for header + menu margin
          maxHeight: 'calc(100% - 56px)',
          top: Dimensions.MenuHeight,
        }}>
          {links.map((link) => (
            <Menu.Item key={link.subdomain}>
              {({ active }) => (
                <a href={getUrl(link.subdomain)}>
                  <div
                    className='flex w-full items-center cursor-pointer px-3 py-2 gap-3'
                    style={{
                      backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                    }}
                  >
                    {getGameLogoAndLabel(link.subdomain, link.subdomain)}
                  </div>
                </a>
              )}
            </Menu.Item>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
