import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import GameLogo from '@root/components/gameLogo';
import { Games } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import getFontFromGameId from '@root/helpers/getFont';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import useUrl from '@root/hooks/useUrl';
import classNames from 'classnames';
import { ChevronDown } from 'lucide-react';
import { useContext } from 'react';

export default function HeaderGameMenu() {
  const { game: currentGame } = useContext(AppContext);
  const getUrl = useUrl();

  return (
    <Menu>
      <MenuButton className='focus:outline-hidden hover-bg-2 text-sm items-center gap-1 rounded-md pl-1.5 pr-1 py-0.5 hidden xl:flex' aria-label='game menu'>
        {getGameFromId(currentGame.id).displayName}
        <ChevronDown className='w-4 h-4' />
      </MenuButton>
      <MenuItems
        anchor={{
          to: 'bottom start',
          gap: '9px',
          padding: '4px',
        }}
        className={classNames(
          'p-1 w-fit origin-top-left rounded-[10px] shadow-lg border overflow-y-auto bg-1 border-color-3 transition duration-100 ease-out focus:outline-hidden data-closed:scale-95 data-closed:opacity-0 z-20',
          getFontFromGameId(currentGame.id)
        )}
        modal={false}
        transition
      >
        {Object.values(Games).map((game) => {
          const isCurrentGame = game.id === currentGame.id;
          const path = isCurrentGame ? '/' : undefined;

          return (
            <MenuItem key={game.id}>
              <a href={getUrl(game.id, path)} suppressHydrationWarning>
                <div
                  className={classNames(
                    'flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3',
                    isCurrentGame ? 'bg-2 hover-bg-4' : 'hover-bg-3'
                  )}
                >
                  <GameLogo gameId={game.id} id={game.id + '_header_menu'} size={20} />
                  <span>{game.displayName}</span>
                </div>
              </a>
            </MenuItem>
          );
        })}
      </MenuItems>
    </Menu>
  );
}
