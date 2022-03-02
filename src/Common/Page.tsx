import React from 'react';
import './index.css';
import { WindowSizeContext } from './WindowSizeContext';
import useWindowSize from './useWindowSize';
import Dimensions from '../Constants/Dimensions';
import Menu from './Menu';
import MenuOptions from '../Models/MenuOptions';

interface PageProps {
  children: JSX.Element;
  menuOptions: MenuOptions | undefined;
}

export default function Page({ children, menuOptions }: PageProps) {
  const windowSize = useWindowSize();

  if (!windowSize) {
    return null;
  }

  return (
    <WindowSizeContext.Provider value={{
      // adjust window size to account for menu
      height: windowSize.height - Dimensions.MenuHeight,
      width: windowSize.width,
    }}>
      <Menu
        menuOptions={menuOptions}
      />
      <div style={{
        position: 'fixed',
        top: Dimensions.MenuHeight,
      }}>
        {children}
      </div>
    </WindowSizeContext.Provider>
  );
}
