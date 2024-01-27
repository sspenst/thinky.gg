import { AppContext } from '@root/contexts/appContext';
import isPro from '@root/helpers/isPro';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Level from '../../models/db/level';
import Modal from '.';

interface EditLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
}

export default function EditLevelModal({ closeModal, isOpen, level }: EditLevelModalProps) {
  const { user } = useContext(AppContext);
  const [authorNote, setAuthorNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>(level.backgroundImageUrl ?? '');
  const [name, setName] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    setAuthorNote(level.authorNote ?? '');
    setName(level.name);
  }, [level]);

  function onSubmit() {
    if (!name || name.length === 0) {
      toast.dismiss();
      toast.error('Error: Name is required', {
        duration: 3000
      });

      return;
    }

    if (name.length > 50) {
      toast.dismiss();
      toast.error('Error: Name cannot be longer than 50 characters', {
        duration: 3000,
      });

      return;
    }

    setIsSubmitting(true);
    toast.dismiss();
    toast.loading('Updating level...');

    fetch(`/api/level/${level._id}`, {
      method: 'PUT',
      body: JSON.stringify({
        authorNote: authorNote,
        backgroundImageUrl: backgroundImageUrl,
        name: name,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(async res => {
      if (res.status === 200) {
        toast.dismiss();
        toast.success('Updated');
        closeModal();

        const newLevel = await res.json();

        if (newLevel) {
          if (!newLevel.isDraft) {
            router.replace(`/level/${newLevel.slug}`);
          } else {
            router.reload();
          }
        }
      } else {
        throw res.text();
      }
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error);
    }).finally(() => {
      setIsSubmitting(false);
    });
  }

  return (
    <Modal
      closeModal={closeModal}
      disabled={isSubmitting}
      isOpen={isOpen}
      onSubmit={onSubmit}
      title='Edit Level'
    >
      <div className='flex flex-col gap-2 w-112 max-w-full'>
        <label className='font-semibold' htmlFor='name'>Name:</label>
        <input
          className='p-1 rounded-md border border-color-4'
          name='name'
          onChange={e => setName(e.target.value)}
          placeholder={'Edit name...'}
          required
          type='text'
          value={name}
        />
        <label className='font-semibold' htmlFor='authorNote'>Author Note:</label>
        <textarea
          className='p-1 rounded-md border border-color-4'
          name='authorNote'
          onChange={e => setAuthorNote(e.target.value)}
          placeholder={'Edit optional author note...'}
          rows={4}
          value={authorNote}
        />
        <div>
          <details className='flex flex-col gap-2 justify-center bg-3 p-1 rounded-lg'>
            <summary className='p-1'>
              <div className='inline-flex items-center gap-2 ml-2'>
                <Image alt='pro' src='/pro.svg' width={16} height={16} style={{ minWidth: 16, minHeight: 16 }} />
                Pro Level Settings
              </div>
            </summary>
            <input disabled={!isPro(user)} className='p-1 rounded-md border border-color-4 w-full' name='backgroundImageUrl' onChange={e => setBackgroundImageUrl(e.target.value)} placeholder={'Background URL (imgur)'} type='text' value={backgroundImageUrl} />
            <span className='text-center text-xs text-neutral-300 italic'>Example: https://i.imgur.com/T2HuKuY.png</span>
            <Link target='_blank' href='https://imgur.com/upload' className='text-center underline text-sm'>Upload to imgur</Link>
            <span className='text-center text-xs text-neutral-300 italic'>Image must respect our level creation <a className='underline' href='https://docs.google.com/document/d/e/2PACX-1vR4E-RcuIpXSrRtR3T3y9begevVF_yq7idcWWx1A-I9w_VRcHhPTkW1A7DeUx2pGOcyuKifEad3Qokn/pub' rel='noreferrer' target='_blank'>terms.</a></span>
          </details>
        </div>
      </div>
    </Modal>
  );
}
