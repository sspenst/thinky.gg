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

function LevelLinkButton(props: LevelLinkButtonProps) {
  const search = props.id === undefined ? undefined : `id=${props.id}`;

  return (
    <Link
      className={search === undefined && props.pathname === 'level' ? 'disabled' : ''}
      to={{
        pathname: `/${props.pathname}`,
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
        {props.text}
      </button>
    </Link>
  );
}

interface MenuProps {
  menuOptions: MenuOptions | undefined;
  width: number;
}

export default function Menu(props: MenuProps) {
  if (!props.menuOptions) {
    return null;
  }

  const titlePadding = 16;
  const titleWidth = props.menuOptions.escapePathname === 'pack' ?
    props.width - 4 * Dimensions.MenuHeight :
    props.menuOptions.escapePathname !== undefined ?
    props.width - 2 * Dimensions.MenuHeight : props.width;
  
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
          {props.menuOptions.escapePathname !== undefined ?
            <LevelLinkButton
              id={props.menuOptions.escapeId}
              pathname={props.menuOptions.escapePathname}
              text={'Esc'}
            />
          : null}
          {props.menuOptions.escapePathname === 'pack' ?
            <LevelLinkButton
              id={props.menuOptions.prevLevelId}
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
              {props.menuOptions.title}
              {props.menuOptions.author !== undefined ?
                <>
                  {' - '}
                  <span className={'italic'}>
                    {props.menuOptions.author}
                  </span>
                </>
              : null}
            </span>
          </div>
        </div>
        <div style={{
          float: 'left',
        }}>
          {props.menuOptions.escapePathname === 'pack' ?
            <LevelLinkButton
              id={props.menuOptions.nextLevelId}
              pathname={'level'}
              text={'Next'}
            />
          : null}
          {props.menuOptions.escapePathname === 'pack' ? <HelpModal/> : null}
        </div>
    </div>
  );
}
