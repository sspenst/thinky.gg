import Level from '../models/db/level';
import { Rating } from 'react-simple-star-rating';
import React, { useCallback, useEffect, useState } from 'react';
import Review from '../models/db/review';
import toast from 'react-hot-toast';
import { mutate } from 'swr';
import useStats from '../hooks/useStats';
import useUser from '../hooks/useUser';
import useLevelBySlug from '../hooks/useLevelBySlug';
import { useRouter } from 'next/router';
import { LevelUrlQueryParams } from '../pages/level/[username]/[slugName]';

export default function ReviewForm({ plevel, userReview, onUpdate }: {plevel?:Level, userReview?:Review, onUpdate?:()=>void}) {
  const displayName = plevel?.name;
  const msg = 'Rate this level';

  const [rating, setRating] = useState(userReview?.score || 0); // initial rating value
  const [reviewBody, setReviewBody] = useState(userReview?.text);
  const router = useRouter();
  const { slugName, username, wid } = router.query as LevelUrlQueryParams;

  const { level, mutateLevel } = useLevelBySlug(username + '/' + slugName);

  const onDeleteReview = useCallback(async () => {
    if (!confirm('Are you sure you would like to delete?')) {
      return;
    }

    // disable save/remove buttons and textarea
    const txt = document.getElementById('message') as HTMLTextAreaElement;

    txt.disabled = true;
    const sbtn = document.getElementById('btn_review_submit') as HTMLButtonElement;

    sbtn.disabled = true;

    const dbtn = document.getElementById('btn_review_delete') as HTMLButtonElement;

    dbtn.disabled = true;

    toast.dismiss();
    toast.loading('Deleting...');
    fetch('/api/review/' + level?._id, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },

    }).then(async(res) => {
      if (res.status !== 200) {
        txt.disabled = false;
        sbtn.disabled = false;

        if (dbtn) {
          dbtn.disabled = false;
        }

        toast.dismiss();
        toast.error('Error deleting review');
      } else {
        toast.dismiss();
        toast.success('Deleted');
        txt.disabled = false;
        sbtn.disabled = false;
        dbtn.disabled = false;
        setReviewBody('');
        setRating(0);
        const ta = document.getElementById('message') as HTMLTextAreaElement;

        ta.value = '';

        if (onUpdate) {
          onUpdate();
        }
      }
    }
    );
  }, [level?._id, onUpdate]);

  const onUpdateReview = useCallback(() => {
    // on change rating, make ajax request to update rating
    toast.dismiss();
    toast.loading('Saving...');
    const txt = document.getElementById('message') as HTMLTextAreaElement;

    txt.disabled = true;
    const sbtn = document.getElementById('btn_review_submit') as HTMLButtonElement;

    sbtn.disabled = true;

    const dbtn = document.getElementById('btn_review_delete') as HTMLButtonElement;

    if (dbtn) {
      dbtn.disabled = true;
    }

    fetch('/api/review/' + level?._id, {
      method: userReview ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        score: rating,
        text: reviewBody,
      })
    }).then(async(res) => {
      if (res.status !== 200) {
        txt.disabled = false;
        sbtn.disabled = false;

        if (dbtn) {
          dbtn.disabled = false;
        }

        toast.dismiss();
        toast.error('Error saving review');
      } else {

        toast.dismiss();
        toast.success('Saved');
        txt.disabled = false;
        sbtn.disabled = false;

        if (dbtn) {
          dbtn.disabled = false;
        }

        if (onUpdate) {
          onUpdate();
        }

      }

    });
  }, [level?._id, onUpdate, rating, reviewBody, userReview]);
  const handleRating = (value:number) => {

    if (value === rating * 20) {
      setRating(0);
    } else {
      setRating(value / 20);
    }

  };

  return <div className='border rounded-lg text-white py-2 px-3 block w-full' style={{
    display: 'inline-block',

    borderColor: 'var(--bg-color-4)',
    maxWidth: 450,
    width: '100%',

  }}>
    <h2>Add a review</h2>
    <Rating
      transition
      onClick={handleRating}
      fillColorArray={['#a17845', '#f19745', '#f1a545', '#a1d325', '#01ea15']}
      size={23}
      ratingValue={rating * 20}
    />
    <textarea id="message" rows={2} className="block p-1 w-full text-sm text-gray-900 bg-gray-100 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 disabled:opacity-25" placeholder="Optional review..."

      onChange={(e)=> {
        const txt = (document.getElementById('message') as HTMLTextAreaElement)?.value;

        setReviewBody(txt);
      }}
    >
      {reviewBody}
    </textarea>
    <button id='btn_review_submit' className="bg-blue-500 hover:bg-blue-700 text-white font-bold p-2 m-1 rounded-lg text-sm focus:bg-blue-800 disabled:opacity-25"
      onClick={(e)=>{
        if (rating === 0 && reviewBody === '') {
          onDeleteReview();
        }
        else {

          onUpdateReview();
        }
      }}>Save</button>
    {(userReview && <button id='btn_review_delete' className="bg-red-500 hover:bg-red-700 text-white font-bold p-2 m-1 rounded-lg text-sm focus:bg-red-800 disabled:opacity-25" onClick={(e)=>{
      onDeleteReview();
    }}>Remove</button>
    )}

  </div>;

}
