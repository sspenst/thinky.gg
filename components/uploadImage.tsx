import Image from 'next/image';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Dimensions from '../constants/dimensions';
import { AppContext } from '../contexts/appContext';
import Avatar from './avatar';

export default function UploadImage() {
  const [bio, setBio] = useState('');
  const inputClass = 'shadow appearance-none border mb-2 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline';
  const buttonClass = 'bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer';
  const { mutateUser, user } = useContext(AppContext);
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  useEffect(() => {
    if (user) {
      setBio(user.bio?.toString() || '');
    }
  }, [user]);

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
    }).finally(() => {
      mutateUser();
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

  function saveAvatar() {
    if (!selectedImage) {
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      toast.loading('Saving avatar...');

      fetch('/api/user/image', {
        method: 'PUT',
        body: e.target?.result,
        credentials: 'include',
      }).then(async res => {
        mutateUser();
        const { updated } = await res.json();

        if (!updated) {
          toast.dismiss();
          toast.error('Error updating avatar');
        } else {
          toast.dismiss();
          toast.success('Updated avatar');
          router.reload();
        }
      }).catch(err => {
        console.error(err);
        toast.dismiss();
        toast.error('Error updating avatar');
      });
    };

    reader.readAsBinaryString(selectedImage);
  }

  if (!user) {
    return null;
  }

  return (
    <div className='flex flex-col items-center'>
      <label className='block font-bold mb-2' htmlFor='avatar'>
        Avatar
      </label>
      <div className='my-2'>
        {!selectedImage ?
          <Avatar hideStatusCircle={true} size={Dimensions.AvatarSizeLarge} user={user} />
          :
          <>
            <div className='border overflow-hidden relative' style={{
              borderColor: 'var(--bg-color-3)',
              borderRadius: Dimensions.AvatarSizeLarge / 2,
              height: Dimensions.AvatarSizeLarge,
              width: Dimensions.AvatarSizeLarge,
            }}>
              <Image
                alt='Avatar'
                fill={true}
                src={URL.createObjectURL(selectedImage)}
              />
            </div>
            <button className='italic underline block' onClick={() => saveAvatar()}>Save</button>
            <button className='italic underline block' onClick={() => setSelectedImage(null)}>Remove</button>
          </>
        }
      </div>
      <div className='mt-4 break-words text-center'>
        <input
          type='file'
          id='avatarFile'
          style={{ display: 'none' }}
          name='avatar'
          accept='image/png, image/jpeg'
          onClick={e => e.currentTarget.value = ''}
          onChange={(event) => {
            if (event && event.target && event.target.files) {
              const files = event.target.files;

              if (!files[0]) {
                return;
              }

              if (files[0].size > 2 * 1024 * 1024) {
                toast.error('Image size must be less than 2MB');

                return;
              }

              // NB: image file must successfully load into an <img> for it to be saveable
              const img = document.createElement('img');

              img.onload = function () {
                if (img.width > 1024 || img.height > 1024) {
                  toast.error('Image must not be larger than 1024x1024');

                  return;
                }

                setSelectedImage(files[0]);
              };

              img.onerror = function() {
                toast.error('Error loading image file');
              };

              const reader = new FileReader();

              reader.onloadend = function (e) {
                img.src = e.target?.result as string;
              };

              reader.readAsDataURL(files[0]);
            }
          }}
        />
        <button className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer' onClick={() => document.getElementById('avatarFile')?.click()}>
          Upload
        </button>
        <div className='text-xs mt-2'>Limits: 1024x1024, 2MB</div>
        <br />
        <form onSubmit={updateBio}>
          <label className='block font-bold mb-2' htmlFor='bio'>
            About me
          </label>
          <textarea
            className={inputClass}
            id='bio'
            name='bio'
            onChange={e => setBio(e.target.value)}
            placeholder='Couple sentences about you?'
            /* restrict to 256 characters */
            maxLength={256}
            rows={4}
            value={bio}
          />
          <button className={buttonClass} type='submit'>Save</button>
        </form>
      </div>
    </div>
  );
}
