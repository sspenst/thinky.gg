import { ObjectId } from 'bson';
import classNames from 'classnames';
import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Theme from '../constants/theme';
import { PageContext } from '../contexts/pageContext';
import isTheme from '../helpers/isTheme';
import useComments from '../hooks/useComments';
import { EnrichedComment } from '../models/db/comment';
import CommentThread from './commentThread';

interface CommentWallProps {
  userId: ObjectId;
}

export default function CommentWall({ userId }: CommentWallProps) {
  const [comments, setComments] = useState<EnrichedComment[]>([]);
  const { commentQuery, mutateComments } = useComments(userId);
  const [isUpdating, setIsUpdating] = useState(false);
  const { setPreventKeyDownEvent } = useContext(PageContext);
  const [text, setText] = useState('');
  const [totalRows, setTotalRows] = useState(0);

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
      if (res.status !== 200) {
        const resp = await res.json();

        toast.dismiss();
        toast.error(resp?.error || 'Error saving comment');
      } else {
        mutateComments();
        toast.dismiss();
        toast.success('Saved');
        setText('');
      }
    }).catch(() => {
      mutateComments();
      toast.dismiss();
      toast.error('Error saving comment');
    }).finally(() => {
      setIsUpdating(false);
    });
  }

  function onShowMore(targetModel: string) {
    setIsUpdating(true);

    // TODO: move body to optinal query parameters
    fetch(`/api/comment/${userId.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        skip: comments.length,
        targetModel: targetModel,
      }),
    }).then(async(res) => {
      if (res.status !== 200) {
        const resp = await res.json();

        toast.dismiss();
        toast.error(resp?.error || 'Error fetching comments');
      } else {
        const resp = await res.json();

        if (resp?.comments) {
          setComments(prevComments => {
            const newComments = [...prevComments];

            newComments.push(...(resp.comments as EnrichedComment[]));

            return newComments;
          });
        }
      }
    }).catch(() => {
      toast.error('Error fetching comments');
    }).finally(() => {
      setIsUpdating(false);
    });
  }

  return (
    <div className='flex flex-col gap-3 max-w-sm w-full'>
      <h2 className='font-bold'>Comments:</h2>
      <div className='flex flex-col gap-2'>
        <textarea
          className={classNames(
            'block p-1 w-full rounded-lg border disabled:opacity-25',
            isTheme(Theme.Light) ?
              'bg-gray-100 focus:ring-blue-500 focus:border-blue-500 border-gray-300' :
              'bg-gray-700 border-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
          )}
          disabled={isUpdating}
          onBlur={() => setPreventKeyDownEvent(false)}
          onFocus={() => setPreventKeyDownEvent(true)}
          onChange={(e) => setText(e.currentTarget.value)}
          placeholder='Add a comment...'
          rows={1}
          value={text}
        />
        {text.length !== 0 &&
          <div className='flex flex-row gap-2'>
            <button
              className='bg-blue-500 hover:bg-blue-700 text-white font-bold p-2 w-fit rounded-lg text-xs focus:bg-blue-800 disabled:opacity-25'
              disabled={isUpdating || (text?.length === 0)}
              onClick={onPostComment}
            >
              Post
            </button>
            <button
              className='font-semibold underline w-fit text-sm'
              onClick={() => setText('')}
            >
              Cancel
            </button>
          </div>
        }
      </div>
      {comments.map((comment) => (
        <div className='flex flex-col gap-3' key={`comment-${comment._id.toString()}`}>
          <CommentThread
            comment={comment}
            mutateComments={mutateComments}
            target={comment._id}
          />
          {comment.replies.map(reply => (
            <CommentThread
              className='ml-8'
              comment={reply}
              key={`comment-reply-${reply._id.toString()}`}
              mutateComments={mutateComments}
              target={comment._id}
            />
          ))}
          {comment.totalReplies > comment.replies.length && !isUpdating &&
            <button
              className='font-semibold underline w-fit text-sm ml-8'
              onClick={() => onShowMore('Comment')}
            >
              Show more
            </button>
          }
        </div>
      ))}
      {totalRows > comments.length && !isUpdating &&
        <button
          className='font-semibold underline w-fit text-sm'
          onClick={() => onShowMore('User')}
        >
          Show more
        </button>
      }
    </div>
  );
}
