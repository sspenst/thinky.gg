import { Menu, Transition } from '@headlessui/react';
import Dimensions from '@root/constants/dimensions';
import { Games } from '@root/constants/Games';
import useUrl from '@root/hooks/useUrl';
import React, { Fragment } from 'react';
import GameLogoAndLabel from '../gameLogoAndLabel';

export default function GameMenu() {
  const getUrl = useUrl();

  return (
    <Menu>
      <Menu.Button>
        <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 hover:opacity-70' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
          <path strokeLinecap='round' strokeLinejoin='round' d='M4 6h16M4 12h16M4 18h16' />
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
        <Menu.Items className={'fixed m-1 w-fit origin-top-left left-0 rounded-[10px] shadow-lg border overflow-y-auto'} style={{
          backgroundColor: 'var(--bg-color-2)',
          borderColor: 'var(--bg-color-4)',
          color: 'var(--color)',
          // NB: hardcoded value accounting for header + menu margin
          maxHeight: 'calc(100% - 56px)',
          top: Dimensions.MenuHeight,
        }}>
          {Object.values(Games).map((game) => (
            <Menu.Item key={game.id}>
              {({ active }) => (
                <a href={getUrl(game.id)}>
                  <div
                    className='flex w-full items-center cursor-pointer px-3 py-2 gap-3'
                    style={{
                      backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                    }}
                  >
                    <GameLogoAndLabel gameId={game.id} id={game.id} />
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
