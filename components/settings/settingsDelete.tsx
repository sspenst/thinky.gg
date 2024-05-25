import { AppContext } from '@root/contexts/appContext';
import { useRouter } from 'next/router';
import React, { useContext } from 'react';
import toast from 'react-hot-toast';

export default function SettingsDelete() {
  const { forceUpdate, mutateUser, setShouldAttemptAuth } = useContext(AppContext);
  const router = useRouter();

  async function deleteAccount() {
    if (prompt('Are you sure you want to delete your account? Type DELETE to confirm.') === 'DELETE') {
      toast.dismiss();
      toast.loading('Deleting account...');
      const res = await fetch('/api/user', {
        method: 'DELETE',
      });

      if (!res.ok) {
        toast.dismiss();
        const resp = await res.json();

        toast.error(resp.error || 'An error occurred.');

        return;
      } else {
        localStorage.clear();
        sessionStorage.clear();
        mutateUser(undefined);
        setShouldAttemptAuth(false);
        router.push('/');
        forceUpdate();
      }
    }
  }

  return (
    <div className='flex flex-col gap-4 justify-center items-center'>
      <button onClick={deleteAccount} className='bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-3 rounded' type='button'>
        Delete Account
      </button>
      <span className='text-sm'>This cannot be undone!</span>
    </div>
  );
}
