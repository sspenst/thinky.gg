import React, { useContext } from 'react';
import Color from '../constants/color';
import Dimensions from '../constants/dimensions';
import HelpModal from './helpModal';
import LevelOptions from '../models/levelOptions';
import Link from 'next/link';
import { WindowSizeContext } from './windowSizeContext';
import { useSWRConfig } from 'swr';
import useUser from './useUser';

interface LevelLinkButtonProps {
  disabled: boolean;
  href: string;
  text: string;
}

function LevelLinkButton({ disabled, href, text }: LevelLinkButtonProps) {
  return (disabled ? 
    <button
      className={'font-semibold disabled'}
      style={{
        height: Dimensions.MenuHeight,
        width: Dimensions.MenuHeight,
      }}
      tabIndex={-1}
    >
      {text}
    </button> :
    <Link href={href} passHref>
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
  escapeHref?: string;
  levelOptions?: LevelOptions;
  subtitle?: string;
  title: string;
}

export default function Menu({ escapeHref, levelOptions, subtitle, title }: MenuProps) {
  const { mutate } = useSWRConfig();
  const { user, isLoading } = useUser();
  const windowSize = useContext(WindowSizeContext);
  const titlePadding = 16;
  const buttonCount = +!!escapeHref + +!!levelOptions;
  const titleWidth = windowSize.width - 2 * buttonCount * Dimensions.MenuHeight;

  function logOut() {
    fetch('/api/logout', {
      method: 'POST',
    }).then(() => {
      mutate('/api/user', undefined);
    });
  }

  return (
    <div style={{
      backgroundColor: Color.BackgroundMenu,
      borderBottom: '1px solid',
      borderColor: 'rgb(130 130 130)',
      height: Dimensions.MenuHeight,
      position: 'fixed',
      top: 0,
      width: windowSize.width,
    }}>
        <div style={{
          float: 'left',
        }}>
          {!escapeHref ? null :
            <LevelLinkButton
              disabled={false}
              href={escapeHref}
              text={'Esc'}
            />
          }
          {!levelOptions ? null :
            <LevelLinkButton
              disabled={!levelOptions.prevLevelId}
              href={`/level/${levelOptions.prevLevelId}`}
              text={'Prev'}
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
              {!subtitle ? null :
                <>
                  {' - '}
                  <span className={'italic'}>
                    {subtitle}
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
              href={`/level/${levelOptions.nextLevelId}`}
              text={'Next'}
            />
            <HelpModal/>
          </>}
        </div>
        <div style={{
          position: 'fixed',
          right: 16,
          lineHeight: Dimensions.MenuHeight + 'px',
        }}>
          {levelOptions || isLoading ? null : !user ?
            <Link href='/login'>Log In</Link> : <>
            <span className='font-semibold' style={{ whiteSpace: 'pre' }}>
              {user.score} <span style={{color: 'lightgreen'}}>✓</span>   <button onClick={logOut} className='italic font-semibold'>{user.name}</button>
            </span>
          </>}
        </div>
    </div>
  );
}
