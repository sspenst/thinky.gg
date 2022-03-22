import React, { useContext } from 'react';
import Dimensions from '../constants/dimensions';
import HelpModal from './helpModal';
import LevelOptions from '../models/levelOptions';
import Link from 'next/link';
import { WindowSizeContext } from './windowSizeContext';
import useUser from './useUser';

interface LevelLinkButtonProps {
  disabled: boolean;
  href: string;
  text: string;
}

function LevelLinkButton({ disabled, href, text }: LevelLinkButtonProps) {
  return (disabled ? 
    <button
      className={'disabled'}
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
        style={{
          height: Dimensions.MenuHeight - 1,
          width: Dimensions.MenuHeight,
        }}
      >
        {text}
      </button>
    </Link>
  );
}

interface MenuProps {
  escapeHref?: string;
  hideUserInfo?: boolean;
  levelOptions?: LevelOptions;
  subtitle?: string;
  title: string;
}

export default function Menu({
    escapeHref,
    hideUserInfo,
    levelOptions,
    subtitle,
    title
  }: MenuProps) {
  const { user, isLoading } = useUser();
  const windowSize = useContext(WindowSizeContext);
  const titlePadding = 16;
  const buttonCount = +!!escapeHref + +!!levelOptions;
  const titleWidth = windowSize.width - 2 * buttonCount * Dimensions.MenuHeight;

  return (
    <div style={{
      backgroundColor: 'var(--bg-color-2)',
      borderBottom: '1px solid',
      borderColor: 'var(--bg-color-4)',
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
              className={'text-2xl'}
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
          {hideUserInfo || isLoading ? null : !user ?
            <>
              <span style={{ margin: '0px 16px' }}>
                <Link href='/login'>Log In</Link>
              </span>
              <Link href='/signup'>Sign Up</Link>
            </>
            :
            <>
              <span style={{ margin: '0px 16px' }}>
                {user.score} <span style={{color: 'lightgreen'}}>✓</span>
              </span>
              <Link href='/account'>{user.name}</Link>
            </>
          }
        </div>
    </div>
  );
}
