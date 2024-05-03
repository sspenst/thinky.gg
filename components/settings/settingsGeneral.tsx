import User from '@root/models/db/user';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import ReactTextareaAutosize from 'react-textarea-autosize';
import UploadImage from './uploadImage';

interface SettingsGeneralProps {
  user: User;
}

export default function SettingsGeneral({ user }: SettingsGeneralProps) {
  const [bio, setBio] = useState(user.bio ?? '');
  const [initialBio, setInitialBio] = useState(user.bio ?? '');
  const [updating, setUpdating] = useState(false);

  function updateUser(
    body: string,
    property: string,
  ) {
    toast.dismiss();
    toast.loading(`Updating ${property}...`);
    setUpdating(true);

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

      setInitialBio(bio);
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error(`Error updating ${property}`);
    }).finally(() => {
      setUpdating(false);
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

  return (
    <div className='flex flex-col justify-center items-center gap-6 w-full max-w-sm'>
      <UploadImage user={user} />
      <form className='flex flex-col gap-3 w-full' onSubmit={updateBio}>
        <label className='font-bold' htmlFor='bio'>
          About me
        </label>
        <ReactTextareaAutosize
          className='bg-inherit block py-1 -mt-2 w-full max-w-full border-b border-neutral-500 disabled:text-neutral-500 transition resize-none placeholder:text-neutral-500 focus:outline-0 rounded-none focus:border-black focus:dark:border-white'
          disabled={updating}
          id='bio'
          maxLength={256}
          onChange={(e) => setBio(e.currentTarget.value)}
          placeholder='Couple sentences about you?'
          value={bio}
        />
        {bio !== initialBio &&
          <div className='flex gap-2'>
            <button
              className='bg-blue-500 enabled:hover:bg-blue-700 text-white font-medium px-3 py-2 rounded-full text-sm disabled:opacity-50 w-fit'
              disabled={updating}
              type='submit'
            >
              Update
            </button>
            <button
              className='enabled:hover:bg-neutral-500 font-medium px-3 py-2 mr-2 rounded-full text-sm disabled:opacity-50 w-fit'
              disabled={updating}
              onClick={() => setBio(initialBio)}
            >
              Cancel
            </button>
          </div>
        }
      </form>
    </div>
  );
}
