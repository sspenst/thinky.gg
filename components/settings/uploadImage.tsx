import { ImageTools } from '@root/helpers/imageTools';
import User from '@root/models/db/user';
import Image from 'next/image';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Dimensions from '../../constants/dimensions';
import ProfileAvatar from '../profile/profileAvatar';

interface UploadImageProps {
  user: User;
}

export default function UploadImage({ user }: UploadImageProps) {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<File | Blob | null>(null);

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

  return (<>
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

          ImageTools.resize(
            files[0],
            { width: Dimensions.AvatarSizeLarge, height: Dimensions.AvatarSizeLarge },
            (file) => setSelectedImage(file),
          );
        }
      }}
    />
    <div className='flex flex-col items-center gap-4'>
      <div className='flex flex-col items-center gap-2'>
        {!selectedImage ?
          <ProfileAvatar hideStatusCircle={true} size={Dimensions.AvatarSizeLarge} user={user} />
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
                objectFit='cover'
                src={URL.createObjectURL(selectedImage)}
              />
            </div>
            <button className='italic hover:underline block' onClick={() => saveAvatar()}>Save</button>
            <button className='italic hover:underline block' onClick={() => setSelectedImage(null)}>Remove</button>
          </>
        }
      </div>
      <button className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline cursor-pointer' onClick={() => document.getElementById('avatarFile')?.click()}>
        Upload
      </button>
    </div>
  </>);
}
