import { Link } from 'react-router-dom';
import React from 'react';

export default function Nav() {
  return (
    <>
      <div><Link to='/'>HOME</Link></div>
      <div><Link to='/data'>DATA</Link></div>
      <div><Link to='/editor'>EDITOR</Link></div>
    </>
  )
}
