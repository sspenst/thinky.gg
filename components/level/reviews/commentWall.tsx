import { Types } from 'mongoose';
import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ReactTextareaAutosize from 'react-textarea-autosize';
import { AppContext } from '../../../contexts/appContext';
import useComments from '../../../hooks/useComments';
import { COMMENT_QUERY_LIMIT } from '../../../models/constants/comment';
import { EnrichedComment } from '../../../models/db/comment';
import isNotFullAccountToast from '../../toasts/isNotFullAccountToast';
import CommentThread from './commentThread';

interface CommentWallProps {
  userId: Types.ObjectId;
}

export default function CommentWall({ userId }: CommentWallProps) {
  const [comments, setComments] = useState<EnrichedComment[]>();
  const { commentQuery, mutateComments } = useComments(userId);
  const [isUpdating, setIsUpdating] = useState(false);
  const [page, setPage] = useState(0);
  const [text, setText] = useState('');
  const [totalRows, setTotalRows] = useState(0);
  const { user } = useContext(AppContext);

  useEffect(() => {
    if (commentQuery) {
      setComments(commentQuery.comments);
      setTotalRows(commentQuery.totalRows);
    }
  }, [commentQuery]);

  function onPostComment() {
    setIsUpdating(true);

    toast.dismiss();
    toast.loading('Saving...');

    fetch(`/api/comment/${userId.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        targetModel: 'User',
      })
    }).then(async(res) => {
      if (res.status === 401) {
        isNotFullAccountToast('Commenting');
      } else if (res.status !== 200) {
        throw res.text();
      } else {
        toast.dismiss();
        toast.success('Saved');
        setText('');
      }
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error || 'Error saving comment');
    }).finally(() => {
      mutateComments();
      setPage(0);
      setIsUpdating(false);
    });
  }

  function onShowMore(page: number) {
    setPage(page);
    setIsUpdating(true);

    fetch(`/api/comment/get?${new URLSearchParams({
      id: userId.toString(),
      page: page.toString(),
      targetModel: 'User',
    })}`, {
      method: 'GET',
    }).then(async(res) => {
      if (res.status !== 200) {
        throw res.text();
      } else {
        const resp = await res.json();

        if (resp?.comments) {
          setComments(resp.comments);
        }
      }
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error || 'Error fetching comments');
    }).finally(() => {
      setIsUpdating(false);
    });
  }

  return (
    <div className='flex flex-col gap-3 max-w-sm w-full'>
      <h2 className='font-bold text-xl'>Comments</h2>
      {user &&
        <div className='flex flex-col gap-2'>
          <ReactTextareaAutosize
            onChange={(e) => setText(e.currentTarget.value)}
            placeholder='Add a comment...'
            value={text}
          />
          {text.length !== 0 &&
            <div className='flex gap-2'>
              <button
                className='bg-blue-500 enabled:hover:bg-blue-700 text-white font-medium px-3 py-2 rounded-full text-sm disabled:opacity-50 w-fit'
                disabled={isUpdating || (text?.length === 0 || text?.length > 500)}
                onClick={onPostComment}
              >
                Save
              </button>
              <button
                className='enabled:hover:bg-neutral-500 font-medium px-3 py-2 mr-2 rounded-full text-sm disabled:opacity-50 w-fit'
                onClick={() => setText('')}
              >
                Cancel
              </button>
            </div>
          }
        </div>
      }
      {!comments ? <span>Loading...</span> :
        comments.length === 0 ? <span>No comments yet!</span> :
          comments.map((comment) => (
            <div className='flex flex-col gap-3' key={`comment-${comment._id.toString()}`}>
              <CommentThread
                comment={comment}
                mutateComments={mutateComments}
                onServerUpdate={() => {
                  mutateComments();
                  setPage(0);
                }}
                target={comment._id}
              />
            </div>
          ))
      }
      {totalRows > COMMENT_QUERY_LIMIT && !isUpdating &&
        <div className='flex flex-row gap-2'>
          {page > 0 &&
            <button
              className='font-semibold underline w-fit text-sm'
              onClick={() => onShowMore(page - 1)}
            >
              Prev page
            </button>
          }
          {totalRows > COMMENT_QUERY_LIMIT * (page + 1) &&
            <button
              className='font-semibold underline w-fit text-sm'
              onClick={() => onShowMore(page + 1)}
            >
              Next page
            </button>
          }
        </div>
      }
    </div>
  );
}
