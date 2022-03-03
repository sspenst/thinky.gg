import React, { useContext } from 'react';
import { Link, To } from 'react-router-dom';
import './index.css';
import Color from '../Constants/Color';
import Dimensions from '../Constants/Dimensions';
import LevelOptions from '../Models/LevelOptions';
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
  escapeTo?: To;
  levelOptions?: LevelOptions;
  title: string | undefined;
}

export default function Menu({ escapeTo, levelOptions, title }: MenuProps) {
  const windowSize = useContext(WindowSizeContext);
  const titlePadding = 16;
  const buttonCount = +!!escapeTo + +!!levelOptions;
  const titleWidth = windowSize.width - 2 * buttonCount * Dimensions.MenuHeight;

  return (
    <div style={{
      backgroundColor: Color.BackgroundMenu,
      height: Dimensions.MenuHeight,
      position: 'fixed',
      top: 0,
      width: windowSize.width,
    }}>
        <div style={{
          float: 'left',
        }}>
          {!escapeTo ? null :
            <LevelLinkButton
              disabled={false}
              text={'Esc'}
              to={escapeTo}
            />
          }
          {!levelOptions ? null :
            <LevelLinkButton
              disabled={!levelOptions.prevLevelId}
              text={'Prev'}
              to={`/level?id=${levelOptions.prevLevelId}`}
            />
          }
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
              {title}
              {!levelOptions ? null :
                <>
                  {' - '}
                  <span className={'italic'}>
                    {levelOptions.author}
                  </span>
                </>
              }
            </span>
          </div>
        </div>
        <div style={{
          float: 'left',
        }}>
          {!levelOptions ? null : <>
            <LevelLinkButton
              disabled={!levelOptions.nextLevelId}
              text={'Next'}
              to={`/level?id=${levelOptions.nextLevelId}`}
            />
            <HelpModal/>
          </>}
        </div>
    </div>
  );
}
