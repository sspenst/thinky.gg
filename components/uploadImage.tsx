import Image from 'next/image';
import { useRouter } from 'next/router';
import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import Dimensions from '../constants/dimensions';
import { PageContext } from '../contexts/pageContext';
import Avatar from './avatar';

export default function UploadImage() {
  const { mutateUser, user } = useContext(PageContext);
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

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
    <>
      <label className='block font-bold mb-2' htmlFor='avatar'>
        Avatar
      </label>
      <div className='my-2'>
        {!selectedImage ?
          <Avatar hideStatusCircle={true} size={Dimensions.AvatarSizeLarge} user={user} />
          :
          <>
            <div className='border overflow-hidden' style={{
              borderColor: 'var(--bg-color-3)',
              borderRadius: Dimensions.AvatarSizeLarge / 2,
              height: Dimensions.AvatarSizeLarge,
              position: 'relative',
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
      <div className='mt-4 break-words'>
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
      </div>
    </>
  );
}
