import React, { useState } from 'react';
import Image from 'next/image';
import UserAvatar from './userAvatar';
import toast from 'react-hot-toast';
import useUser from '../hooks/useUser';

export default function UploadImage() {
  const { mutateUser } = useUser();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  function saveAvatar() {
    if (!selectedImage) {
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      toast.loading('Saving avatar...');

      const result = e.target?.result;

      fetch('/api/user/image', {
        method: 'PUT',
        body: result,
        credentials: 'include',
        headers: {
          'Content-Type': 'image/png',
        },
      }).then(async res => {
        mutateUser();
        const { updated } = await res.json();

        if (!updated) {
          toast.dismiss();
          toast.error('Error updating avatar');
        } else {
          toast.dismiss();
          toast.success('Updated avatar');
        }

        setSelectedImage(null);
      }).catch(err => {
        console.error(err);
        toast.dismiss();
        toast.error('Error updating avatar');
      });
    };

    reader.readAsBinaryString(selectedImage);

    // reader.readAsDataURL(selectedImage);
  }

  return (
    <>
      <label className='block font-bold mb-2' htmlFor='avatar'>
        Avatar
      </label>
      <div className='my-2'>
        {!selectedImage ?
          <UserAvatar size={150}/>
          :
          <>
            <Image
              alt='not found'
              className='block'
              height={150}
              src={URL.createObjectURL(selectedImage)}
              style={{
                borderRadius: 75,
              }}
              width={150}
            />
            <button className='italic underline block' onClick={()=>saveAvatar()}>Save</button>
            <button className='italic underline block' onClick={()=>setSelectedImage(null)}>Remove</button>
          </>
        }
      </div>
      <div className='my-4 break-words'>
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

              if (files[0].size > 1024 * 1024) {
                toast.error('Image size must be less than 1MB');

                return;
              }

              setSelectedImage(files[0]);
            }
          }}
        />
        <button className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer' onClick={() => document.getElementById('avatarFile')?.click()}>
          Upload
        </button>
      </div>
    </>
  );
}
