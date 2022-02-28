import React from 'react';
import { Link } from 'react-router-dom';
import './index.css';
import Color from '../Constants/Color';
import Dimensions from '../Constants/Dimensions';
import MenuOptions from '../Models/MenuOptions';
import HelpModal from './HelpModal';

interface LevelLinkButtonProps {
  id: string | undefined;
  pathname: string;
  text: string;
}

function LevelLinkButton({ id, pathname, text }: LevelLinkButtonProps) {
  const search = id === undefined ? undefined : `id=${id}`;

  return (
    <Link
      className={search === undefined && pathname === 'level' ? 'disabled' : ''}
      to={{
        pathname: `/${pathname}`,
        search: search,
      }}
    >
      <button
        className={'font-semibold'}
        style={{
          height: Dimensions.MenuHeight,
          width: Dimensions.MenuHeight,
        }}
        tabIndex={-1}
      >
        {text}
      </button>
    </Link>
  );
}

interface MenuProps {
  menuOptions: MenuOptions | undefined;
  width: number;
}

export default function Menu({ menuOptions, width }: MenuProps) {
  if (!menuOptions) {
    return null;
  }

  const titlePadding = 16;
  const titleWidth = menuOptions.escapePathname === 'pack' ?
    width - 4 * Dimensions.MenuHeight :
    menuOptions.escapePathname !== undefined ?
    width - 2 * Dimensions.MenuHeight : width;
  
  return (
    <div style={{
      backgroundColor: Color.BackgroundMenu,
      height: Dimensions.MenuHeight,
      position: 'fixed',
      top: 0,
      width: '100%',
    }}>
        <div style={{
          float: 'left',
        }}>
          {menuOptions.escapePathname !== undefined ?
            <LevelLinkButton
              id={menuOptions.escapeId}
              pathname={menuOptions.escapePathname}
              text={'Esc'}
            />
          : null}
          {menuOptions.escapePathname === 'pack' ?
            <LevelLinkButton
              id={menuOptions.prevLevelId}
              pathname={'level'}
              text={'Prev'}
            />
          : null}
        </div>
        <div style={{
          float: 'left',
          padding: `0 ${titlePadding}px`,
          width: titleWidth,
        }}>
          <div
            className={'hide-scroll'}
            style={{
              overflow: 'auto',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              width: titleWidth - 2 * titlePadding,
            }}
          >
            <span
              style={{
                lineHeight: Dimensions.MenuHeight + 'px',
                verticalAlign: 'middle',
              }}
              className={'font-semibold text-2xl'}
            >
              {menuOptions.title}
              {menuOptions.author !== undefined ?
                <>
                  {' - '}
                  <span className={'italic'}>
                    {menuOptions.author}
                  </span>
                </>
              : null}
            </span>
          </div>
        </div>
        <div style={{
          float: 'left',
        }}>
          {menuOptions.escapePathname === 'pack' ?
            <LevelLinkButton
              id={menuOptions.nextLevelId}
              pathname={'level'}
              text={'Next'}
            />
          : null}
          {menuOptions.escapePathname === 'pack' ? <HelpModal/> : null}
        </div>
    </div>
  );
}
