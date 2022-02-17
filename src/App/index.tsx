import React from 'react';
import { Link } from 'react-router-dom';
import Menu from '../Common/Menu';
import useWindowSize from '../Common/useWindowSize';
import Dimensions from '../Constants/Dimensions';
import MenuOptions from '../Models/MenuOptions';

export default function App() {
  const menuOptions = new MenuOptions('Pathology');
  const windowSize = useWindowSize();
  let height = windowSize.height;
  let width = windowSize.width;

  if (!height || !width) {
    return null;
  }

  return (<>
    <Menu
      menuOptions={menuOptions}
      width={width}
    />
    <div style={{
      position: 'fixed',
      top: Dimensions.MenuHeight,
    }}>
      <div><Link to='/catalog'>CATALOG</Link></div>
      <div><Link to='/data'>DATA</Link></div>
      <div><Link to='/editor'>EDITOR</Link></div>
      <div><Link to='/login'>LOG IN</Link></div>
      <div><Link to='/signup'>SIGN UP</Link></div>
    </div>
  </>);
}
