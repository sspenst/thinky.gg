import { AppContext } from '@root/contexts/appContext';
import { blueButton } from '@root/helpers/className';
import { ImageTools } from '@root/helpers/imageTools';
import User from '@root/models/db/user';
import Image from 'next/image';
import { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Dimensions from '../../constants/dimensions';
import ProfileAvatar from '../profile/profileAvatar';

interface UploadImageProps {
  user: User;
}

export default function UploadImage({ user }: UploadImageProps) {
  const { mutateUser, user: userContext } = useContext(AppContext);
  const [selectedImage, setSelectedImage] = useState<File | Blob | null>(null);
  const [updating, setUpdating] = useState(false);
  const [userState, setUserState] = useState<User>(user);

  useEffect(() => {
    if (userContext) {
      setUserState(userContext);
    }
  }, [userContext]);

  function saveAvatar() {
    if (!selectedImage) {
      return;
    }

    setUpdating(true);

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
          mutateUser().then(() => {
            setSelectedImage(null);
          });
        }
      }).catch(err => {
        console.error(err);
        toast.dismiss();
        toast.error('Error updating avatar');
      }).finally(() => {
        setUpdating(false);
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
          <ProfileAvatar hideStatusCircle={userState.hideStatus} size={Dimensions.AvatarSizeLarge} user={userState} />
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
            <div className='flex gap-2'>
              <button
                className='bg-blue-500 enabled:hover:bg-blue-700 text-white font-medium px-3 py-2 rounded-full text-sm disabled:opacity-50 w-fit'
                disabled={updating}
                onClick={() => saveAvatar()}
              >
                Save
              </button>
              <button
                className='enabled:hover:bg-neutral-500 font-medium px-3 py-2 rounded-full text-sm disabled:opacity-50 w-fit'
                disabled={updating}
                onClick={() => setSelectedImage(null)}
              >
                Cancel
              </button>
            </div>
          </>
        }
      </div>
      <button className={blueButton} onClick={() => document.getElementById('avatarFile')?.click()}>
        Upload
      </button>
    </div>
  </>);
}
