import { Menu, MenuButton, MenuItems } from '@headlessui/react';
import { GameType } from '@root/constants/Games';
import Role from '@root/constants/role';
import getFontFromGameId from '@root/helpers/getFont';
import { ScreenSize } from '@root/hooks/useDeviceCheck';
import User from '@root/models/db/user';
import classNames from 'classnames';
import Image from 'next/image';
import Link from 'next/link';
import { useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import LinkInfo from '../formatted/linkInfo';
import Nav from '../nav';
import LoadingSpinner from '../page/loadingSpinner';
import MultiSelectUser from '../page/multiSelectUser';
import StyledTooltip from '../page/styledTooltip';
import Directory from './directory';
import Dropdown from './dropdown';
import HeaderControls from './headerControls';
import HeaderGameMenu from './headerGameMenu';

interface HeaderProps {
  folders?: LinkInfo[];
  isFullScreen?: boolean;
  subtitle?: LinkInfo;
  title?: LinkInfo;
}

export default function Header({
  folders,
  isFullScreen,
  subtitle,
  title,
}: HeaderProps) {
  const [background, setBackground] = useState<string>();
  const { deviceInfo, game, setShowNav, user, mutateUser } = useContext(AppContext);
  const [impersonatingUser, setImpersonatingUser] = useState<User | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const isNavDropdown = deviceInfo.screenSize < ScreenSize.XL || isFullScreen;

  useEffect(() => {
    if (!window.location.hostname.includes('thinky.gg')) {
      setBackground('linear-gradient(45deg, darkred 20%, var(--bg-color-2) 20%, var(--bg-color-2) 40%, var(--bg-color) 40%, var(--bg-color) 60%, var(--bg-color-2) 60%, var(--bg-color-2) 80%, var(--bg-color) 80%, var(--bg-color) 100%');
    }
  }, []);

  // Check if we're currently impersonating
  useEffect(() => {
    const checkImpersonation = async () => {
      if (user) {
        // First check if the user object has impersonatingAdminId (from server)
        if ((user as any).impersonatingAdminId) {
          setIsImpersonating(true);
          setImpersonatingUser(user);

          return;
        }

        // Otherwise check the token client-side
        const token = document.cookie.match(/token=([^;]+)/)?.[1];

        if (token) {
          try {
            // Decode token without verification (just to check structure)
            const parts = token.split('.');

            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));

              if (payload.isImpersonating && payload.adminId) {
                setIsImpersonating(true);
                // The current user is the impersonated user
                setImpersonatingUser(user);
              }
            }
          } catch {
            // Ignore decoding errors
          }
        }
      }
    };

    checkImpersonation();
  }, [user]);

  return (
    <header
      className='select-none shadow-md w-full fixed top-0 z-20 flex justify-between px-4 gap-4 border-color-2 border-b bg-1'
      style={{
        background: background,
        height: Dimensions.MenuHeight,
        minHeight: Dimensions.MenuHeight,
      }}
    >
      <div className='flex items-center truncate z-20 gap-4'>
        {game.isNotAGame ? null :
          isNavDropdown ?
            <Menu>
              <MenuButton className='w-full focus:outline-hidden'>
                <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 hover:opacity-70' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M4 6h16M4 12h16M4 18h16' />
                </svg>
              </MenuButton>
              <MenuItems
                anchor={{
                  to: 'bottom end',
                  gap: '17px', // move down
                  padding: '4px', // Minimum padding from viewport edges
                }}
                className={classNames('p-1 w-fit origin-top-left rounded-[10px] shadow-lg border overflow-y-auto bg-1 border-color-3 transition duration-100 ease-out focus:outline-hidden data-closed:scale-95 data-closed:opacity-0 z-40', getFontFromGameId(game.id))}
                modal={false}
                transition
              >
                <Nav isDropdown />
              </MenuItems>
            </Menu>
            :
            <button onClick={() => setShowNav(showNav => !showNav)}>
              <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 hover:opacity-70' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M4 6h16M4 12h16M4 18h16' />
              </svg>
            </button>
        }
        <div className='flex items-center gap-2'>
          <div>
            <Link className='font-bold text-3xl' href='/'>
              <Image alt='logo' src={game.logo} width='24' height='24' className='h-6 w-6' style={{ minWidth: 24, minHeight: 24 }} />
            </Link>
          </div>
          <HeaderGameMenu />
          <div className='-ml-2'>
            <Directory folders={folders} subtitle={subtitle} title={title} />
          </div>
        </div>
      </div>
      {user === undefined ?
        <div className='flex items-center'>
          <LoadingSpinner />
        </div>
        :
        <div className='flex gap-4 items-center z-20'>
          {(isImpersonating || (user && user.roles?.includes(Role.ADMIN))) && (
            <div className='hidden sm:flex items-center gap-2'>
              {isImpersonating && (
                <div className='bg-red-600 text-white px-2 py-1 rounded-sm text-sm font-medium'>
                  Impersonating
                </div>
              )}
              {isImpersonating ? (
                <div className='flex items-center gap-2 bg-red-100 dark:bg-red-900 px-3 py-1 rounded-md'>
                  <span className='text-sm font-medium'>{impersonatingUser?.name}</span>
                  <button
                    onClick={async () => {
                      const res = await fetch('/api/admin/impersonate', {
                        method: 'DELETE',
                      });

                      if (res.ok) {
                        toast.success('Stopped impersonating');
                        setImpersonatingUser(null);
                        setIsImpersonating(false);
                        mutateUser();
                        window.location.reload();
                      } else {
                        toast.error('Failed to stop impersonating');
                      }
                    }}
                    className='text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300'
                    title='Stop impersonating'
                  >
                    <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
                      <path fillRule='evenodd' d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' clipRule='evenodd' />
                    </svg>
                  </button>
                </div>
              ) : (
                <MultiSelectUser
                  className='w-48'
                  controlStyles={{
                    minHeight: '36px',
                    height: '36px'
                  }}
                  placeholder='Impersonate user...'
                  onSelect={async (selectedUser: User | null) => {
                    if (!selectedUser) {
                    // Stop impersonating
                      const res = await fetch('/api/admin/impersonate', {
                        method: 'DELETE',
                      });

                      if (res.ok) {
                        toast.success('Stopped impersonating');
                        setImpersonatingUser(null);
                        setIsImpersonating(false);
                        mutateUser();
                        window.location.reload();
                      } else {
                        toast.error('Failed to stop impersonating');
                      }
                    } else {
                    // Start impersonating
                      const res = await fetch('/api/admin/impersonate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: selectedUser._id }),
                      });

                      if (res.ok) {
                        const data = await res.json();

                        toast.success(`Now impersonating ${data.targetUser.name}`);
                        setImpersonatingUser(selectedUser);
                        setIsImpersonating(true);
                        mutateUser();
                        window.location.reload();
                      } else {
                        const error = await res.json();

                        toast.error(error.error || 'Failed to impersonate user');
                      }
                    }
                  }}
                />
              )}
            </div>
          )}
          <HeaderControls />
          {user && <div className='hidden sm:block h-6 w-px bg-neutral-500' />}
          <div className='flex gap-3 items-center'>
            {user && !game.isNotAGame && <>
              {!game.disableRanked && <>
                <Link
                  className='hidden sm:block'
                  data-tooltip-content='Ranked Solves'
                  data-tooltip-id='ranked-solves-header'
                  href='/ranked'
                >
                  <span className='font-bold leading-none'>{user.config.calcRankedSolves} 🏅</span>
                  <StyledTooltip id='ranked-solves-header' />
                </Link>
                <div className='hidden sm:block h-6 w-px bg-neutral-500 mr-1' />
              </>}
              <Link
                className='hidden sm:block mr-1'
                data-tooltip-content={game.type === GameType.COMPLETE_AND_SHORTEST ? 'Levels Completed' : 'Levels Solved'}
                data-tooltip-id='levels-solved-header'
                href='/users'
              >
                <span className='font-bold'>{game.type === GameType.COMPLETE_AND_SHORTEST ? user.config.calcLevelsCompletedCount : user.config.calcLevelsSolvedCount}</span>
                <StyledTooltip id='levels-solved-header' />
              </Link>
            </>}
            {user === null &&
              <div className='hidden sm:flex gap-3'>
                <Link
                  className='hover:underline'
                  href='/login'
                  onClick={() => {
                    sessionStorage.clear();
                  }}
                >
                  Log In
                </Link>
                <Link href='/signup' className='hover:underline'>
                  Sign Up
                </Link>
              </div>
            }
            <Dropdown />
          </div>
        </div>
      }
    </header>
  );
}
