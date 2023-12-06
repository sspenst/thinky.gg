import { Menu, Transition } from '@headlessui/react';
import Dimensions from '@root/constants/dimensions';
import { Games } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import Image from 'next/image';
import Link from 'next/link';
import React, { Fragment, useCallback, useContext } from 'react';

const LinksThatCarryOver = [
  '/profile'
];

const links = Object.values(Games).map((game) => ({
  logo: game.logo,
  subdomain: game.id,
  label: game.displayName,
}));

export function GameMenu() {
  const { game } = useContext(AppContext);

  const getUrl = useCallback((subdomain: string) => {
    // if port is not 80 or 443, include it in the hostname

    // also hostname needs to strip out subdomain
    const hostname = window.location.port === '80' || window.location.port === '443' ?
      window.location.hostname :
      `${window.location.hostname}:${window.location.port}`;
    const dots = hostname.split('.');

    const hostnameStrippedOfFirstSubdomain = dots.length === 2 ?
      dots.slice(1).join('.') : hostname;

    const currentProtocol = (window.location.protocol);
    const currentHost = (hostnameStrippedOfFirstSubdomain);
    const carryOver = LinksThatCarryOver.some((link) => window.location.pathname.startsWith(link));

    const currentPath = (carryOver ? window.location.pathname : '');

    return `${currentProtocol}//${subdomain}.${currentHost}${currentPath}`;
  }, []);

  return (
    <Menu>
      <Menu.Button className='inline-flex justify-center px-2 py-2 text-sm font-medium text-white bg-black rounded-md bg-opacity-40 hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75'>
        <div className='flex items-center gap-3'>
          <Image alt='logo' src={game.logo} width='24' height='24' className='h-6 w-6' style={{ minWidth: 24, minHeight: 24 }} /> {game.displayName}
        </div>
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
        <Menu.Items className='absolute m-1 w-fit origin-top-right rounded-[10px] shadow-lg border overflow-y-auto' style={{
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
                <Link
                  href={getUrl(link.subdomain)}
                >
                  <div
                    className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3'
                    style={{
                      backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                    }}
                  >
                    <Image alt='logo' src={link.logo} width='24' height='24' className='h-6 w-6' style={{ minWidth: 24, minHeight: 24 }} />
                    {link.label}
                  </div>
                </Link>
              )}
            </Menu.Item>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
