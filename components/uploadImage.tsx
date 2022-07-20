import React, { useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';

export default function UploadImage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  function saveAvatar() {
    if (!selectedImage) {
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      toast.loading('Saving avatar...');

      //.toDataURL()

      const result = e.target?.result;
      // const b64 = window.btoa(result);
      console.log(result);

      fetch('/api/user/image', {
        method: 'PUT',
        body: JSON.stringify({
          image: result,
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
    };

    reader.readAsDataURL(selectedImage);
  }

  return (
    <div className='my-2 border p-2 rounded-md' style={{ borderColor: 'var(--bg-color-4)' }}>
      Avatar:
      {selectedImage && (
        <div className='my-2'>
          <Image alt='not found' width={150} height={150} src={URL.createObjectURL(selectedImage)} />
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
}
