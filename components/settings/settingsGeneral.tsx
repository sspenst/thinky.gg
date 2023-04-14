import { AppContext } from '@root/contexts/appContext';
import User from '@root/models/db/user';
import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import UploadImage from './uploadImage';

interface SettingsGeneralProps {
  user: User;
}

export default function SettingsGeneral({ user }: SettingsGeneralProps) {
  const { user: reqUser } = useContext(AppContext);
  const [bio, setBio] = useState(user.bio ?? '');

  function updateUser(
    body: string,
    property: string,
  ) {
    toast.dismiss();
    toast.loading(`Updating ${property}...`);

    fetch('/api/user', {
      method: 'PUT',
      body: body,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(async res => {
      const { updated } = await res.json();

      if (!updated) {
        toast.dismiss();
        toast.error(`Error updating ${property}`);
      } else {
        toast.dismiss();
        toast.success(`Updated ${property}`);
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error(`Error updating ${property}`);
    });
  }

  function updateBio(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    updateUser(
      JSON.stringify({
        bio: bio,
      }),
      'bio',
    );
  }

  async function clearTours() {
    const res = await fetch('/api/user-config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toursCompleted: [],
      }),
    });

    if (!res.ok) {
      toast.dismiss();
      toast.error('Error occured');
    } else {
      toast.dismiss();
      toast.success('Onboarding tooltips reset');
    }
  }

  return (
    <div className='flex flex-col justify-center items-center gap-6'>
      <UploadImage user={user} />
      <form onSubmit={updateBio}>
        <label className='block font-bold mb-2' htmlFor='bio'>
          About me
        </label>
        <textarea
          className={'shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'}
          id='bio'
          name='bio'
          onChange={e => setBio(e.target.value)}
          placeholder='Couple sentences about you?'
          maxLength={256}
          rows={4}
          value={bio}
        />
        <button className='italic underline' type='submit'>Update</button>
      </form>
      { reqUser && reqUser.config.toursCompleted?.length > 0 && (<button className='italic underline' onClick={() => {
        if (confirm('This will show the onboarding tooltips again. Are you sure?')) {
          clearTours();
        }
      }}>Reset onboarding tooltips</button>)}
    </div>
  );
}
