import React from 'react';
import { Link } from 'react-router-dom';
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
    <Link to={{
      pathname: `/${props.pathname}`,
      search: search,
    }}>
      <button
        className={'border-2 font-semibold'}
        style={{
          height: Dimensions.MenuHeight,
          width: Dimensions.MenuHeight,
        }}
      >
        {props.text}
      </button>
    </Link>
  );
}

interface MenuProps {
  menuOptions: MenuOptions | undefined;
}

export default function Menu(props: MenuProps) {
  if (!props.menuOptions) {
    return null;
  }
  
  return (
    <div style={{width: '100%'}}>
      <div style={{
        display: 'table',
        margin: '0 auto',
      }}>
        {props.menuOptions.escapePathname !== undefined ?
          <LevelLinkButton
            id={props.menuOptions.escapeId}
            pathname={props.menuOptions.escapePathname}
            text={'Esc'}
          />
        : null}
        {props.menuOptions.prevLevelId !== undefined ?
          <LevelLinkButton
            id={props.menuOptions.prevLevelId}
            pathname={'level'}
            text={'Prev'}
          />
        : null}
        <span
          style={{
            lineHeight: Dimensions.MenuHeight + 'px',
            verticalAlign: 'middle',
          }}
          className={'font-semibold text-2xl'}
        >
          {props.menuOptions.title}
          {props.menuOptions.subtitle ? ' - ' + props.menuOptions.subtitle : null}
        </span>
        {props.menuOptions.nextLevelId !== undefined ?
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
