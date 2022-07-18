import React, { useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';

const UploadImage = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  function saveAvatar() {
    if (!selectedImage) {
      return;
    }

    toast.loading('Saving avatar...');

    fetch('/api/user/image', {
      method: 'PUT',
      body: JSON.stringify({
        image: selectedImage.stream().read()
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(async res => {
      const { updated } = await res.json();

      if (!updated) {
        toast.dismiss();
        toast.error('Error updating avatar');
      } else {
        toast.dismiss();
        toast.success('Updated avatar');
      }

      // mutateUser();
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error updating avatar');
    });
  }

  return (
    <div className='my-2 border p-2 rounded-md' style={{ borderColor: 'var(--bg-color-4)' }}>
      Avatar:
      {selectedImage && (
        <div className='my-2'>
          <Image alt='not found' width={250} height={250} src={URL.createObjectURL(selectedImage)} />
          <br/>
          <button onClick={()=>saveAvatar()}>Save</button>
          <br/>
          <button onClick={()=>setSelectedImage(null)}>Remove</button>
        </div>
      )}
      <div className='my-2'>
        <input
          type='file'
          name='avatar'
          accept='image/png, image/jpeg'
          onChange={(event) => {
            if (event && event.target && event.target.files) {
              const files = event.target.files;

              if (files[0].size > 1024 * 1024) {
                toast.error('Image size must be less than 1MB');

                return;
              }

              setSelectedImage(files[0]);
            }
          }}
        />
      </div>
    </div>
  );
};

export default UploadImage;
