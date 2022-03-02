import React from 'react';
import { Link } from 'react-router-dom';
import Menu from '../Common/Menu';
import useWindowSize from '../Common/useWindowSize';
import { WindowSizeContext } from '../Common/WindowSizeContext';
import Dimensions from '../Constants/Dimensions';
import MenuOptions from '../Models/MenuOptions';
import UserState from './UserState';

export default function App() {
  const windowSize = useWindowSize();

  if (!windowSize) {
    return null;
  }

  return (
    <WindowSizeContext.Provider value={windowSize}>
      <Menu
        menuOptions={new MenuOptions('Pathology')}
      />
      <div style={{
        position: 'fixed',
        top: Dimensions.MenuHeight,
      }}>
        <div><Link to='/catalog'>CATALOG</Link></div>
        <div><Link to='/leaderboard'>LEADERBOARD</Link></div>
        {/* <div><Link to='/data'>DATA</Link></div>
        <div><Link to='/editor'>EDITOR</Link></div> */}
        <UserState/>
      </div>
    </WindowSizeContext.Provider>
  );
}
