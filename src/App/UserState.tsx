import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import User from '../DataModels/Pathology/User';

export default function UserState() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User>();

  useEffect(() => {
    async function getUser() {
      const response = await fetch(process.env.REACT_APP_SERVICE_URL + 'user', {credentials: 'include'});
      setUser(await response.json());
    }

    getUser();
  }, []);

  function logOut() {
    fetch(process.env.REACT_APP_SERVICE_URL + 'logout', {credentials: 'include'}).then(() => {
      setUser(undefined);
      navigate('/login');
    });
  }

  return (<div>
    You are logged in as <span className='italic font-semibold'>{!user ? '' : user.name}</span>
    <br/>
    <button onClick={logOut}>LOG OUT</button>
  </div>);
}
