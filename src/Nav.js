import { Link } from 'react-router-dom';

export default function Nav() {
  return (
    <>
      <div><Link to='/'>HOME</Link></div>
      <div><Link to='/data'>DATA</Link></div>
      <div><Link to='/editor'>EDITOR</Link></div>
    </>
  )
}
