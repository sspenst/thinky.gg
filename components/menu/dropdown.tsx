
import React, { useState } from 'react';
import Dimensions from '../../constants/dimensions';
import HelpModal from '../helpModal';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useStats from '../../hooks/useStats';
import useUser from '../../hooks/useUser';

interface SettingProps {
  children: JSX.Element;
}

function Setting({ children }: SettingProps) {
  return (
    <div
      style={{
        padding: Dimensions.MenuPadding,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
}

export default function Dropdown() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const router = useRouter();
  const { mutateStats } = useStats();
  const { user, isLoading, mutateUser } = useUser();

  function logOut() {
    fetch('/api/logout', {
      method: 'POST',
    }).then(() => {
      mutateStats(undefined);
      mutateUser(undefined);
      router.push('/');
    });
  }

  return (
    <div
      style={{
        float: 'left',
        paddingLeft: Dimensions.MenuPadding,
        paddingRight: Dimensions.MenuPadding * 2,
      }}
    >
      <button
        className={showSettings ? 'text-xl' : 'text-3xl'}
        onClick={() => setShowSettings(prevShowSettings => !prevShowSettings)}
        style={{
          height: Dimensions.MenuHeight,
          width: 16,
        }}
      >
        {showSettings ? '✖' : '≡'}
      </button>
      <div
        style={{
          backgroundColor: 'var(--bg-color-2)',
          borderBottomLeftRadius: 6,
          borderBottomRightRadius: 6,
          borderColor: 'var(--bg-color-4)',
          borderStyle: 'solid',
          borderWidth: '0 1px 1px 1px',
          display: showSettings ? 'block' : 'none',
          minWidth: 160,
          position: 'absolute',
          right: Dimensions.MenuPadding,
          top: Dimensions.MenuHeight -  1,
        }}
      >
        <Setting>
          <>
            <button onClick={() => setIsHelpOpen(true)}>
              Help
            </button>
            <HelpModal closeModal={() => setIsHelpOpen(false)} isHelpOpen={isHelpOpen}/>
          </>
        </Setting>
        {!isLoading && user ?
          <>
            <Setting>
              <Link href='/account'>
                Account
              </Link>
            </Setting>
            <Setting>
              <button onClick={logOut}>
                Log Out
              </button>
            </Setting>
          </>
        : null}
      </div>
    </div>
  );
}