import { useRouter } from 'next/router';
import React, { useContext } from 'react';
import { AppContext } from '../../contexts/appContext';

export default function SettingsDanger() {
  const { forceUpdate, mutateUser, setShouldAttemptAuth } = useContext(AppContext);
  const router = useRouter();

  function deleteAccount() {
    if (prompt('Are you sure you want to delete your account? Type DELETE to confirm.') === 'DELETE') {
      fetch('/api/user', {
        method: 'DELETE',
      }).then(() => {
        localStorage.clear();
        sessionStorage.clear();
        mutateUser(undefined);
        setShouldAttemptAuth(false);
        router.push('/');
        forceUpdate();
      });
    }
  }

  return (
    <div className='flex flex-col gap-4 justify-center items-center'>
      <button onClick={deleteAccount} className='bg-red-500 mt-2 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-fit' type='button'>
        Delete Account
      </button>
      This cannot be undone!
    </div>
  );
}
