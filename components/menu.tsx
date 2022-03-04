import React, { useContext } from 'react';
import Link from 'next/link';
import Color from '../constants/color';
import Dimensions from '../constants/dimensions';
import HelpModal from './helpModal';
import LevelOptions from '../models/levelOptions';
import { WindowSizeContext } from './windowSizeContext';

interface LevelLinkButtonProps {
  disabled: boolean;
  href: string;
  text: string;
}

function LevelLinkButton({ disabled, href, text }: LevelLinkButtonProps) {
  return (
    <Link href={href}>
      <button
        className={'font-semibold' + (disabled ? ' disabled' : '')}
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
  const windowSize = useContext(WindowSizeContext);
  const titlePadding = 16;
  const buttonCount = +!!escapeHref + +!!levelOptions;
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
    </div>
  );
}
