import React, { useContext } from 'react';
import { Link, To } from 'react-router-dom';
import './index.css';
import Color from '../Constants/Color';
import Dimensions from '../Constants/Dimensions';
import MenuOptions from '../Models/MenuOptions';
import HelpModal from './HelpModal';
import { WindowSizeContext } from './WindowSizeContext';

interface LevelLinkButtonProps {
  disabled: boolean;
  text: string;
  to: To;
}

function LevelLinkButton({ disabled, text, to }: LevelLinkButtonProps) {
  return (
    <Link
      className={disabled ? 'disabled' : ''}
      to={to}
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
}

export default function Menu({ menuOptions }: MenuProps) {
  const windowSize = useContext(WindowSizeContext);

  if (!menuOptions) {
    return null;
  }

  const titlePadding = 16;
  const isLevelPage = menuOptions.escapeTo !== undefined &&
    menuOptions.escapeTo.toString().includes('pack');
  const titleWidth = menuOptions.escapeTo === undefined ?
    windowSize.width : isLevelPage ?
    windowSize.width - 4 * Dimensions.MenuHeight :
    windowSize.width - 2 * Dimensions.MenuHeight;
  
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
          {menuOptions.escapeTo !== undefined ?
            <LevelLinkButton
              disabled={false}
              text={'Esc'}
              to={menuOptions.escapeTo}
            />
          : null}
          {isLevelPage ?
            <LevelLinkButton
              disabled={!menuOptions.prevLevelId}
              text={'Prev'}
              to={`/level?id=${menuOptions.prevLevelId}`}
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
          {isLevelPage ? <>
            <LevelLinkButton
              disabled={!menuOptions.nextLevelId}
              text={'Next'}
              to={`/level?id=${menuOptions.nextLevelId}`}
            />
            <HelpModal/>
          </> : null}
        </div>
    </div>
  );
}
