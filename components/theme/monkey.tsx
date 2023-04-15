import { TileType } from '@root/constants/tileType';
import React from 'react';

export interface ThemeIconProps {
    levelDataType: TileType;
    innerSize: number;
    size: number;
    fontSize: number;
    text: JSX.Element;
    leastMoves: number;
    overstepped: boolean;
}

// TOOD figure out how to memoize these functions so they don't get recreated on every render
function Monkey({ size, overstepped }: ThemeIconProps) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      xmlnsXlink='http://www.w3.org/1999/xlink'
      width={size}
      height={size}
      viewBox={'0 0 ' + 48 + ' ' + 48 }>
      <defs>
        <path
          id='f'
          fillRule='evenodd'
          d='M-9.5 7.25a1.5 1.75 0 11-3 0 1.5 1.75 0 113 0z'
          overflow='visible'
        />
      </defs>
      <defs>
        <linearGradient id='d'>
          <stop offset='0' stopColor='#f6e1cf' />
          <stop offset='0.5' stopColor='#e19d56' />
          <stop offset='1' stopColor='#f4dcb7' />
        </linearGradient>
        <linearGradient id='l'>
          <stop offset='0' stopColor='#8f5402' />
          <stop offset='1' stopColor='#6e4001' />
        </linearGradient>
        <linearGradient id='e'>
          <stop offset='0' stopColor='#fff' />
          <stop offset='1' stopColor='#fff' stopOpacity='0.3' />
        </linearGradient>
        <linearGradient
          id='t'
          x1='24'
          x2='24'
          y1='7.4'
          y2='38.33'
          gradientUnits='userSpaceOnUse'
          xlinkHref='#e'
        />
        <linearGradient
          id='y'
          x1='-10.735'
          x2='-9.25'
          y1='11.428'
          y2='18.441'
          gradientUnits='userSpaceOnUse'
          xlinkHref='#l'
        />
        <linearGradient
          id='w'
          x1='-10.154'
          x2='-7.959'
          y1='10.911'
          y2='18.146'
          gradientUnits='userSpaceOnUse'
          xlinkHref='#l'
        />
        <linearGradient
          id='i'
          x1='-5.268'
          x2='-12.272'
          y1='20.641'
          y2='8.686'
          gradientUnits='userSpaceOnUse'
          xlinkHref='#e'
        />
        <linearGradient
          id='q'
          x1='29.064'
          x2='12.86'
          y1='39.42'
          y2='2.492'
          gradientUnits='userSpaceOnUse'
          xlinkHref='#e'
        />
        <radialGradient
          id='v'
          cx='-14.823'
          cy='20.156'
          r='5.329'
          gradientTransform='matrix(2.4518 1.1747 -1.3243 2.8056 46.039 -21.187)'
          gradientUnits='userSpaceOnUse'
          xlinkHref='#d'
        />
        <radialGradient
          id='x'
          cx='-3.065'
          cy='18.305'
          r='5.331'
          gradientTransform='translate(7.835 -46.79) scale(3.556)'
          gradientUnits='userSpaceOnUse'
          xlinkHref='#d'
        />
        <radialGradient
          id='z'
          cx='-6'
          cy='37.75'
          r='14'
          gradientTransform='matrix(1 0 0 .26786 0 27.638)'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0' />
          <stop offset='1' stopOpacity='0' />
        </radialGradient>
        <radialGradient
          id='s'
          cx='24'
          cy='32.821'
          r='15'
          gradientTransform='matrix(2.7839 0 0 1.9617 -42.813 -33.634)'
          gradientUnits='userSpaceOnUse'
          xlinkHref='#d'
        />
        <radialGradient
          id='r'
          cx='23.988'
          cy='30.126'
          r='10.988'
          gradientTransform='matrix(1.8382 0 0 .85527 -20.108 3.134)'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0' stopColor='#3d280a' />
          <stop offset='1' stopColor='#3d280a' stopOpacity='0' />
        </radialGradient>
        <radialGradient
          id='u'
          cx='24'
          cy='13.058'
          r='16.972'
          gradientTransform='matrix(1.6351 0 0 1.8304 -15.241 -12.151)'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0' stopColor='#a15702' />
          <stop offset='1' stopColor='#683c00' />
        </radialGradient>
      </defs>
      <path
        fill='url(#z)'
        fillRule='evenodd'
        d='M8 37.75a14 3.75 0 11-28 0 14 3.75 0 1128 0z'
        opacity='0.485'
        overflow='visible'
        transform='matrix(1.5357 0 0 1.513 33.464 -17.114)'
      />
      <path
        fill='url(#y)'
        fillRule='evenodd'
        stroke='#3d280a'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='0.837'
        d='M-4.5 14.75a4.75 4.75 0 11-9.5 0 4.75 4.75 0 119.5 0z'
        overflow='visible'
        transform='matrix(1.0421 0 0 1.3684 16.139 .816)'
      />
      <path
        fill='none'
        stroke='url(#i)'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1.009'
        d='M-4.5 14.75a4.75 4.75 0 11-9.5 0 4.75 4.75 0 119.5 0z'
        opacity='0.2'
        overflow='visible'
        transform='matrix(.8421 0 0 1.166 14.289 3.84)'
      />
      <path
        fill='url(#x)'
        fillRule='evenodd'
        stroke='#50340d'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1.147'
        d='M-4.5 14.75a4.75 4.75 0 11-9.5 0 4.75 4.75 0 119.5 0z'
        overflow='visible'
        transform='matrix(.79945 0 0 .95167 14.627 7.03)'
      />
      <path
        fill='url(#w)'
        fillRule='evenodd'
        stroke='#3d280a'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='0.837'
        d='M-4.5 14.75a4.75 4.75 0 11-9.5 0 4.75 4.75 0 119.5 0z'
        overflow='visible'
        transform='matrix(1.0421 0 0 1.3684 51.139 .816)'
      />
      <path
        fill='none'
        stroke='url(#i)'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1.009'
        d='M-4.5 14.75a4.75 4.75 0 11-9.5 0 4.75 4.75 0 119.5 0z'
        opacity='0.2'
        overflow='visible'
        transform='matrix(.8421 0 0 1.166 49.289 3.802)'
      />
      <path
        fill='url(#v)'
        fillRule='evenodd'
        stroke='#50340d'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1.153'
        d='M-4.5 14.75a4.75 4.75 0 11-9.5 0 4.75 4.75 0 119.5 0z'
        overflow='visible'
        transform='matrix(.78975 0 0 .95167 48.026 7.03)'
      />
      <path
        fill='url(#u)'
        fillRule='evenodd'
        stroke='#3d280a'
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M37.5 23.5c7.5 8 0 19-13.5 19s-21-11-13.5-19c-4-10.5 4-18 13.5-18s17.5 7.5 13.5 18z'
        overflow='visible'
      />
      <path
        fill='none'
        stroke='url(#t)'
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M36.5 23.5c7 8 .203 18-12.5 18-12.704 0-19.5-10-12.5-18-4-10.5 3.56-17 12.5-17s16.5 6.5 12.5 17z'
        opacity='0.381'
        overflow='visible'
      />
      <path
        fill='url(#s)'
        fillRule='evenodd'
        stroke='#7a4f13'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1.003'
        d='M17.838 10.505c-3.573.22-6.338 3.597-6.338 7.995 0 1.915.48 3.91 1.384 5.309C10.771 25.574 9.5 27 9.502 30.339 9.504 35.947 15 40.5 24 40.5c9-.002 14.495-4.552 14.498-10.16.001-3.339-1.27-4.765-3.383-6.53.904-1.399 1.384-3.394 1.384-5.309 0-4.54-2.966-7.995-6.7-7.995-2.451 0-4.613 1.587-5.8 3.96-1.187-2.373-3.348-3.96-5.8-3.96-.116 0-.246-.007-.362 0z'
        overflow='visible'
      />
      <use
        fillRule='evenodd'
        overflow='visible'
        transform='matrix(1.3333 0 0 1.4286 34.667 11.143)'
        xlinkHref='#f'
      />
      <path
        fill='none'
        stroke='url(#r)'
        strokeLinecap='round'
        d={'M13.5 ' + (overstepped ? 30 : 26.6) + 'c6.293 ' + (overstepped ? -2.4 : 2.4) + ' 14.683 ' + (overstepped ? -2.4 : 2.4) + ' 20.976 0'}
        opacity='0.881'
      />
      <path
        fill='none'
        stroke='url(#q)'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1.003'
        d='M18.263 11.505c-3.476-.092-5.924 3.312-5.901 7.462.01 1.788.796 3.728 1.638 5.033-1.968 1.648-3.364 2.903-3.499 6.017-.226 5.234 4.972 9.464 13.498 9.482 8.399.017 13.646-4.097 13.498-9.482-.085-3.115-1.53-4.369-3.498-6.017.842-1.305 1.629-3.245 1.638-5.033.022-4.259-2.446-7.778-6.239-7.462C27.124 11.695 26 13 25 15c-.5.5-1.5.5-2 0-1-2-2-3.5-4.737-3.495z'
        opacity='0.4'
        overflow='visible'
      />
      <use
        fillRule='evenodd'
        overflow='visible'
        transform='matrix(1.3333 0 0 1.4286 42.667 11.143)'
        xlinkHref='#f'
      />
    </svg>
  );
}

function Banana({ fontSize, size, text }: ThemeIconProps) {
  return (
    <div
      className=''
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: size,
        height: size,
      }}>
      <span style={{
        position: 'absolute',
        zIndex: 2,
        color: 'darkbrown',
        top: -size + fontSize * 1.95,
        fontSize: fontSize * .7,
        // rotate 10 degrees
        transform: 'rotate(20deg)',
      }}>{text}</span>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        className='svg-icon'
        style={{ width: '100%', height: '100%', verticalAlign: 'middle' }}
        fill='currentColor'
        overflow='hidden'
        viewBox='0 0 1024 1024'
        // rotation
        transform='rotate(-30)'
      >
        <path
          fill='#FFD243'
          d='M609.3 909.7c-126.3 0-252.8-54-346.9-148.1C78.5 577.7 64.1 293.1 230.1 127l1.2-1.2c7.6-7.6 17-11.6 27.2-11.6 11.4 0 22.8 5.2 30.5 13.8 5.4 6 11.4 16.3 9.7 31.4-16.2 143.8 41.8 297.4 155.1 410.7C554 670.5 686.2 728 816.5 728c16.1 0 32.3-.9 48.1-2.7 1.7-.2 3.4-.3 5.1-.3 19.6 0 32 12.9 37 25 6.3 15 3.1 31-8.5 42.6l-1.2 1.2c-74.7 74.8-176.9 115.9-287.7 115.9z'
        />
        <path
          fill='#454A57'
          d='M258.5 130.5c6.8 0 13.7 3.1 18.4 8.4 4.6 5.1 6.5 11.4 5.6 18.7-16.8 148.7 42.9 307.2 159.8 424.1C545.6 685 682 744.3 816.5 744.3c16.7 0 33.5-.9 49.9-2.8 1.1-.1 2.2-.2 3.3-.2 11.6 0 19 7.8 22 15 2.2 5.2 4.4 15.4-5 24.9l-1.1 1.1C813.8 854 715.8 893.5 609.3 893.5c-59.7 0-118.9-12.1-176-35.9-59.2-24.8-112.9-60.9-159.4-107.5-86.4-86.4-137.2-198-142.9-314.1-5.6-114.9 33.6-220.6 110.5-297.5l1.1-1.1c4.7-4.6 10-6.9 15.9-6.9m-.1-32.5c-13.5 0-27.2 5-38.6 16.3l-1.2 1.2C45.9 288.2 60.4 582.6 250.9 773.1 352.3 874.5 483.1 926 609.3 926c111 0 218.4-39.8 299.2-120.6l1.2-1.2c35.7-36 8.4-95.4-40.1-95.4-2.3 0-4.6.1-6.9.4-15.2 1.7-30.7 2.6-46.2 2.6-121.2 0-250.1-52-351.2-153-114-114-165.6-263.5-150.5-397.4C319 124.5 289.5 98 258.4 98z'
        />
        <path
          fill='#454A57'
          d='M729.2 811C444.6 811 213 579.4 213 294.8c0-9 7.3-16.3 16.3-16.3s16.3 7.3 16.3 16.3c0 266.7 217 483.8 483.8 483.8 9 0 16.3 7.3 16.3 16.3-.2 8.9-7.5 16.1-16.5 16.1z'
        />
        <path
          fill='#C19311'
          d='M191.1 172.6c11.8-16.2 24.9-31.4 39-45.6l1.2-1.2c7.6-7.6 17.1-11.6 27.2-11.6 11.4 0 22.8 5.2 30.5 13.8 5.4 6 11.4 16.3 9.7 31.4-1.5 13.5-2.4 27.3-2.6 41.2l-105-28z'
        />
        <path
          fill='#454A57'
          d='M258.5 130.5c6.8 0 13.7 3.1 18.4 8.4 4.6 5.1 6.5 11.4 5.6 18.7-.8 7.3-1.5 14.6-1.9 22.1L219 163.2c7.2-8.6 14.7-16.8 22.6-24.7l1.1-1.1c4.6-4.6 9.9-6.9 15.8-6.9m0-32.5c-13.5 0-27.2 5-38.6 16.3l-1.2 1.2c-20.7 20.7-38.6 43.1-53.9 66.8L312.5 222c-.7-20.4 0-40.7 2.3-60.6C319 124.5 289.5 98 258.5 98z'
        />
      </svg>
    </div>
  );
}

function Rock() {
  return <svg
    xmlns='http://www.w3.org/2000/svg'
    version='1.1'
    viewBox='0 0 73.901 49.349'
    style={{ width: '100%', height: '100%', verticalAlign: 'middle' }}

    xmlSpace='preserve'
  >
    <g transform='matrix(1.25 0 0 -1.25 0 49.349)'>
      <g fillRule='evenodd'>
        <path
          fill='#7c7367'
          d='M54.961 33.878c0 .082-.055.269-.16.562-.133.293-.199.52-.199.68v.078c.586-.453 1.171-1.094 1.757-1.918l-1.398.598zm-2.883-2.559c-.398-.906-.812-1.602-1.238-2.078-.774-.906-1.801-1.109-3.078-.602h-.242c1.039-.375 3.253-.586 6.64-.64a8.556 8.556 0 00.281-2.078c0-.746-.109-2.016-.32-3.801l-2.16 1.078c.32-3.012-.332-5.559-1.961-7.641-1.547-1.972-3.613-3.117-6.199-3.437-1.442-.188-2.535-.879-3.281-2.082-.641-1.039-2.332-1.559-5.079-1.559-2.132 0-3.75.188-4.839.559.105.187.597.762 1.476 1.722.75.774 1.121 1.454 1.121 2.04-1.039-.266-2.172-.813-3.398-1.641-1.016-.692-2.629-1.199-4.84-1.52.613-.48 1.184-.918 1.719-1.32.265-.238.398-.519.398-.84 0-1.172-.719-1.984-2.156-2.437-1.949-.617-3.469-1.774-4.563-3.485L17 .44c.426 1.067 1.492 3.426 3.199 7.078.696 1.469 1.039 2.895 1.039 4.282 0 .32-.093.746-.277 1.281-.215.535-.359.894-.441 1.078.265-.238.8-1.426 1.601-3.559l.32-.398c.664.957 2.254 2.691 4.758 5.199 1.789 1.813 2.828 3.453 3.121 4.918l.16.16c.692.801 1.508 1.707 2.442 2.723.586.746.797 1.547.637 2.398.375-.718 1.652-3.758 3.839-9.121l.243-.359c.05.32.082.75.082 1.281 0 3.012-.254 5.481-.762 7.402-.535 2.157-1.441 3.918-2.719 5.278l-1.32-.043.039-1.278.48-2.242c-1.281 2.215-2.082 3.496-2.402 3.84a13.778 13.778 0 01-3.48 1.762l-1.399.281 5.039.078c2.801 0 5-.414 6.602-1.238.398-.297.812-.707 1.238-1.242l-.598.039v-10c.348-.985.68-2.199 1-3.637.293-1.336.438-2.215.438-2.644v-.477c2.055-.137 3.414.344 4.082 1.437.32.508.613 1.75.879 3.723l.562-.484a8.467 8.467 0 011.321-.84c.504.934.824 1.84.957 2.723.054.371.082.972.082 1.8l-.121 2.758c-1.547-.531-2.586-1.027-3.118-1.48.211.535.665 1.066 1.356 1.601.508.371.762 1.028.762 1.961-.774 1.625-1.215 2.637-1.321 3.039v.121c.586.028 1.719.239 3.403.641 1.757.426 2.879.773 3.355 1.039zM7.52 12.678c.187.082.761.426 1.718 1.039.668.403 1.563.708 2.684.922-.297-2.32-.574-4.535-.844-6.64-.156-1.121-.465-2.426-.918-3.918-.453.32-1.027 1.492-1.719 3.519-.746 2.188-1.054 3.879-.921 5.078z'
        />
        <path
          fill='#b3aa9e'
          d='M.602 14.401l.039.316H.68a6.933 6.933 0 01-.078-.316zm0-.082c.023.133.066.266.117.398l1.203-.16.797-.398c1.254-.984 2.32-2.371 3.203-4.16.906-1.918 1.359-3.824 1.359-5.719 0-.348-.054-.547-.16-.602-.055-.023-.121-.011-.199.043a.895.895 0 00-.281.161c-.586.398-1.653 1.332-3.2 2.796C1.84 8.225.906 9.214.641 9.639L.48 9.8 0 11.401l.32 2.039a.53.53 0 00.078.281c0 .106.028.2.082.282.028.078.051.172.079.277 0 .027.015.039.043.039zM5 23.717c.055-.183.227-.304.52-.359 1.066.109 1.773.336 2.121.68l-2.403.363L5 23.717zm9.238 6.922c-.504.215-1.117.321-1.84.321-.718 0-1.32-.106-1.796-.321-.508-.214-.762-.464-.762-.761 0-.293.254-.543.762-.758.476-.215 1.078-.32 1.796-.32.723 0 1.336.105 1.84.32.481.215.723.465.723.758 0 .297-.242.547-.723.761zm16.801-.281c-.316-.426-.906-2.266-1.758-5.519-.695-2.614-2.148-4.719-4.359-6.321-1.363-.984-3.149-1.664-5.363-2.039a21.886 21.886 0 00-5.918-.238 8.598 8.598 0 01-4.602-.801c-1.57-.773-2.559-1.16-2.961-1.16-.238 0-.945.266-2.117.801-1.176.558-2.016 1.051-2.52 1.476.266.668.586 1.442.957 2.321 1.575 3.761 2.934 6.269 4.082 7.523.985 1.09 2.028 2.703 3.122 4.84 1.011 2.023 1.703 3.211 2.078 3.559.613.535 1.386.757 2.32.679 2.32-.16 4.32-.199 6-.121.934.027 3.348.734 7.238 2.121 3.762 1.332 6.989 2 9.684 2 1.492 0 4.531-.558 9.117-1.679 4.641-1.122 7.492-2.016 8.559-2.68 0-.16.066-.387.203-.68.105-.293.16-.48.16-.562-.109-.161-.387-.493-.84-1-.43-.477-.723-.774-.883-.879a38.839 38.839 0 01-3.879-1.078c-.535-.188-1.32-.282-2.359-.282-4.32.293-7.387.493-9.203.602-1.598.824-3.797 1.238-6.598 1.238l-5.039-.078 1.399-.281a13.778 13.778 0 003.48-1.762zm17.68 5.16c0 .321-.028.508-.078.563l-.121-.043v-1l-12-.078c.402-.188 1.214-.375 2.441-.559 1.652-.269 3.453-.402 5.398-.402 2.907 0 4.36.508 4.36 1.519zm-31.36-10.879l-.32 2.719c-2.691-.824-4.414-1.504-5.16-2.039-.133-.078-.504-.547-1.117-1.398.343-.508.691-.868 1.039-1.082.48-.293 1.066-.438 1.758-.438 2.535 0 3.8.746 3.8 2.238zm.36-1.922l1.801-.039c.48 0 1.16.106 2.039.321.933.215 1.64.453 2.121.718l-5.961-1zm-1.321 7.801c0-.32.176-.597.524-.84.316-.238.703-.359 1.156-.359s.856.121 1.203.359c.321.243.481.52.481.84 0 .321-.16.602-.481.84-.347.242-.75.359-1.203.359s-.84-.117-1.156-.359c-.348-.238-.524-.519-.524-.84zm-2.437-15.84c.16.028.293.028.398 0h.52c.082-.211.16-.425.242-.64 2-5.172 2.531-8.36 1.598-9.559-.797-1.039-1.574-1.558-2.321-1.558-.796 0-1.679.078-2.636.238.05.187.039 1.199-.043 3.043-.078 1.89.148 3.746.679 5.558.481 1.52 1 2.493 1.563 2.918z'
        />
        <path
          fill='#d2c8ba'
          d='M.602 14.319v.082c.023.106.05.211.078.316h.039a2.118 2.118 0 01-.117-.398zm30.437 16.039c.32-.348 1.121-1.625 2.402-3.84l.118-.918c.16-.855-.051-1.652-.637-2.402a113.512 113.512 0 01-2.442-2.719l-.359-.359a207.03 207.03 0 00-4.32-3c-1.707-1.149-3.602-2.028-5.68-2.641-.293-.027-1.121-.012-2.48.039-.961.028-1.707.067-2.243.121-.21 0-.386.012-.519.039h-.52a.943.943 0 01-.398 0c-.453 0-1.133-.011-2.039-.039-1.121-.214-2.016-.519-2.684-.922-.957-.613-1.531-.957-1.718-1.039-.188 0-1 .227-2.442.68-1.332.43-2.117.695-2.359.801l-.797.398-1.121.602c.238.906.398 1.426.48 1.558l.16-.16c.504-.425 1.348-.918 2.52-1.476 1.172-.535 1.879-.801 2.117-.801.402 0 1.387.387 2.961 1.16 1.469.692 3 .961 4.602.801 2-.188 3.972-.109 5.918.238 2.214.375 4 1.055 5.363 2.039 2.211 1.602 3.664 3.707 4.359 6.321.852 3.253 1.438 5.093 1.758 5.519zm-16.801.281c.481-.214.723-.464.723-.761 0-.293-.242-.543-.723-.758-.504-.215-1.117-.32-1.84-.32-.718 0-1.32.105-1.796.32-.508.215-.762.465-.762.758 0 .297.254.547.762.761.476.215 1.078.321 1.796.321.723 0 1.336-.106 1.84-.321zM5 23.717l.238.684 2.403-.363c-.348-.348-1.055-.571-2.121-.68-.293.055-.465.176-.52.359zm43.719 11.801c0-1.011-1.453-1.519-4.36-1.519-1.945 0-3.746.133-5.398.402-1.227.184-2.039.371-2.441.559l12 .078v1l.121.043c.05-.055.078-.242.078-.563zm-3.399-6c-1.332-.105-3.425.055-6.281.481-.426.535-.84.949-1.238 1.242 1.812-.109 4.879-.309 9.199-.602 1.039 0 1.824.094 2.359.282 1.172.398 2.465.757 3.879 1.078l-1.16-.68c-.476-.266-1.598-.613-3.355-1.039-1.684-.402-2.817-.613-3.403-.641v-.121zm-28.922 1c0 .321.176.602.524.84.316.242.703.359 1.156.359s.856-.117 1.203-.359c.321-.238.481-.519.481-.84 0-.32-.16-.597-.481-.84-.347-.238-.75-.359-1.203-.359s-.84.121-1.156.359c-.348.243-.524.52-.524.84zm1.321-7.801l5.961 1c-.481-.265-1.188-.503-2.121-.718-.879-.215-1.559-.321-2.039-.321l-1.801.039zm-.36 1.922c0-1.492-1.265-2.238-3.8-2.238-.692 0-1.278.145-1.758.438-.348.214-.696.574-1.039 1.082.613.851.984 1.32 1.117 1.398.746.535 2.469 1.215 5.16 2.039l.32-2.719z'
        />
        <path
          fill='#635b52'
          d='M25.238 3.198l-4.879-1.641c1.094 1.707 2.614 2.868 4.563 3.481 1.437.453 2.156 1.269 2.156 2.441 0 .321-.133.602-.398.84a89.18 89.18 0 00-1.719 1.32c2.211.321 3.824.828 4.84 1.52 1.226.828 2.359 1.375 3.398 1.641 0-.586-.371-1.266-1.121-2.043-.879-.957-1.371-1.532-1.476-1.719 1.089-.371 2.707-.559 4.839-.559 2.747 0 4.438.52 5.079 1.559.746 1.203 1.839 1.894 3.281 2.082 2.586.32 4.652 1.465 6.199 3.437 1.629 2.082 2.281 4.629 1.961 7.641l2.16-1.078c.215 1.785.32 3.055.32 3.801 0 .636-.093 1.332-.281 2.078-3.387.054-5.601.265-6.64.64h.242c1.277-.507 2.304-.304 3.078.602.426.476.84 1.172 1.238 2.078l1.16.68c.16.105.453.402.883.879.453.507.731.839.84 1l1.398-.598c.426-.613.973-1.535 1.641-2.762l.641-1.84.238-1.16c.16-.851.242-1.437.242-1.758 0-1.601-.973-4.828-2.922-9.679-.211-.59-1.051-1.656-2.519-3.203-1.547-1.653-2.731-2.68-3.559-3.078-1.867-.934-3.973-1.653-6.32-2.161l-4.879-.922L25.32 3.241c-.027 0-.054-.016-.082-.043zM44.84 18.44c-.692 1.492-1.039 2.25-1.039 2.277 0 .75.238 1.481.719 2.204.535.453 1.574.945 3.121 1.48l.117-2.762c0-.828-.024-1.425-.078-1.8-.133-.879-.453-1.786-.961-2.719a8.404 8.404 0 00-1.321.84l-.558.48zM33.559 25.6l-.118.918-.48 2.242-.039 1.278 1.316.043c1.282-1.364 2.188-3.121 2.723-5.281.504-1.922.758-4.387.758-7.399 0-.535-.028-.961-.082-1.281l-.239.359c-2.183 5.36-3.464 8.399-3.839 9.121zM20.52 14.159l-.399.32c2.078.613 3.973 1.492 5.68 2.641.961.64 2.398 1.64 4.32 3l.199.199c-.293-1.465-1.332-3.105-3.121-4.918-2.504-2.508-4.094-4.242-4.758-5.199l-.32.398c-.801 2.133-1.336 3.321-1.601 3.559z'
        />
        <path
          fill='#9b9286'
          d='M20.359 1.557l4.879 1.645c-.398-.16-1.558-.574-3.476-1.242C19.68 1.268 18.094.76 17 .44a10.094 10.094 0 00-2.879-.441c-.293 0-.828.281-1.601.84-1.2.855-2.653 1.668-4.36 2.441l-.48.16c-.188.078-.375.16-.559.238.106.055.16.254.16.602 0 1.895-.453 3.801-1.359 5.719-.883 1.789-1.949 3.176-3.203 4.16.242-.106 1.027-.371 2.359-.801 1.442-.453 2.254-.68 2.442-.68-.133-1.199.175-2.89.921-5.078.692-2.027 1.266-3.199 1.719-3.519.453 1.492.762 2.797.918 3.918.27 2.105.547 4.32.844 6.64.906.028 1.586.039 2.039.039-.563-.425-1.082-1.398-1.563-2.918a17.15 17.15 0 01-.679-5.558c.082-1.844.093-2.856.043-3.043.957-.16 1.84-.238 2.636-.238.747 0 1.524.519 2.321 1.558.933 1.199.402 4.387-1.598 9.559-.082.215-.16.429-.242.64.133-.027.309-.039.519-.039a33.749 33.749 0 012.243-.121c1.359-.051 2.187-.066 2.48-.039l.399-.32c.082-.188.226-.547.441-1.078.184-.535.277-.961.277-1.281 0-1.387-.343-2.813-1.039-4.282C18.492 3.866 17.426 1.507 17 .44l3.359 1.117zM.641 9.639c.265-.425 1.199-1.414 2.8-2.961 1.547-1.464 2.614-2.398 3.2-2.8-1.496.668-2.563 1.293-3.2 1.882-.722.665-1.656 1.957-2.8 3.879zm.039 5.078H.641l.121.442h.039l1.121-.602-1.203.16H.68zm38.359 15.282c2.856-.426 4.949-.586 6.281-.481.106-.398.547-1.414 1.321-3.039 0-.933-.254-1.586-.762-1.961-.691-.531-1.145-1.066-1.359-1.597-.481-.723-.719-1.454-.719-2.204 0-.023.347-.785 1.039-2.277-.266-1.973-.559-3.215-.879-3.723-.668-1.089-2.027-1.57-4.082-1.437v.48c0 .426-.145 1.305-.438 2.641-.32 1.438-.652 2.652-1 3.641v9.996l.598-.039z'
        />
      </g>
    </g>
  </svg>;
}

function Grass({ innerSize, fontSize, text, size }: ThemeIconProps) {
  // croppyed image https://images.pexels.com/photos/1089450/pexels-photo-1089450.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2
  return <div
    className=''
    style={{
      backgroundImage: 'url(/themes/monkey-theme/grass2.png)',
      backgroundSize: 'cover',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      width: size,
      height: size,
    }}
  >
    <span style={{
      position: 'absolute',
      zIndex: 2,
      color: 'lightyellow',
      //top: -innerSize + fontSize * 1.45,
    }}>{text}</span>

  </div>;
}

export const MONKEY_THEME_ICONS: Partial<Record<TileType, (props: ThemeIconProps) => JSX.Element>> = {
  [TileType.Start]: Monkey,
  [TileType.End]: Banana,
  //[LevelDataType.Block]: Rock,
  [TileType.Default]: Grass,
};