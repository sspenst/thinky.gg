import React, { useContext } from 'react';
import Role from '../../constants/role';
import { AppContext } from '../../contexts/appContext';

export default function ProAccountForm() {
  const { mutateUser, user, userConfig } = useContext(AppContext);
  const hasPro = user?.roles?.includes(Role.PRO_SUBSCRIBER);

  return (
    <div className='flex justify-center items-center p-3'>
      <div className='flex flex-col gap-3'>
        <div className='font-bold'>
          {hasPro ? 'Manage Pro Account' : 'Upgrade to Pro'}
        </div>
      </div>
    </div>
  );
}
