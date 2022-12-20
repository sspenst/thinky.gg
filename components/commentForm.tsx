import { ObjectId } from 'bson';
import classNames from 'classnames';
import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import Theme from '../constants/theme';
import { PageContext } from '../contexts/pageContext';
import getFormattedDate from '../helpers/getFormattedDate';
import useComments from '../hooks/useComments';
import FormattedUser from './formattedUser';

interface CommentFormProps {
  depth?: number;
  target: ObjectId;
}

export default function CommentForm({ depth = 0, target }: CommentFormProps) {
  const { comments, mutateComments } = useComments(target);
  const [isUpdating, setIsUpdating] = useState(false);
  const { setPreventKeyDownEvent, user } = useContext(PageContext);
  const [text, setText] = useState('');

  function onDeleteComment(commentId: ObjectId) {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setIsUpdating(true);

    toast.dismiss();
    toast.loading('Deleting...');

    fetch('/api/comment/' + commentId, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(async(res) => {
      if (res.status !== 200) {
        const resp = await res.json();

        toast.dismiss();
        toast.error(resp?.error || 'Error deleting comment');
      } else {
        mutateComments();
        toast.dismiss();
        toast.success('Deleted');
        setText('');
      }
    }).catch(() => {
      mutateComments();
      toast.dismiss();
      toast.error('Error deleting comment');
    }).finally(() => {
      setIsUpdating(false);
    });
  }

  function onPostComment(target: ObjectId) {
    setIsUpdating(true);

    toast.dismiss();
    toast.loading('Saving...');

    fetch('/api/comment/' + target.toString(), {
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

  if (!user) {
    return null;
  }

  return (
    <div className='flex flex-col gap-2 max-w-md w-full'>
      <div className='flex flex-row gap-2'>
        <textarea
          className={classNames(
            'block p-1 w-full rounded-lg border disabled:opacity-25',
            document.body.classList.contains(Theme.Light) ?
              'bg-gray-100 focus:ring-blue-500 focus:border-blue-500 border-gray-300' :
              'bg-gray-700 border-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
          )}
          disabled={isUpdating}
          onBlur={() => setPreventKeyDownEvent(false)}
          onFocus={() => setPreventKeyDownEvent(true)}
          onChange={(e) => setText(e.currentTarget.value)}
          placeholder={depth === 0 ? 'Add comment...' : 'Reply...'}
          rows={1}
          value={text}
        />
        <button
          className='bg-blue-500 hover:bg-blue-700 text-white font-bold p-2 rounded-lg text-xs focus:bg-blue-800 disabled:opacity-25'
          disabled={isUpdating || (text?.length === 0)}
          onClick={() => onPostComment(target)}>
          {depth === 0 ? 'Post' : 'Reply'}
        </button>
      </div>
      {comments?.map((comment) => (
        <div
          className='flex flex-col gap-2'
          key={comment._id.toString()}
        >
          <div className='flex justify-between'>
            <div className='flex gap-x-2 items-center flex-wrap'>
              <FormattedUser user={comment.author} />
              <span className='text-sm' suppressHydrationWarning style={{
                color: 'var(--color-gray)',
              }}>
                {getFormattedDate(new Date(comment.createdAt).getTime() / 1000)}
              </span>
            </div>
            {comment.author._id.toString() === user._id.toString() && (
              <button
                className='text-xs  text-white font-bold p-1  rounded-lg text-sm  disabled:opacity-25'
                disabled={isUpdating}
                onClick={() => onDeleteComment(comment._id)}>
                X
              </button>
            )}
          </div>
          {comment.text}
          <div className='ml-8'>
            {depth <= 0 && <CommentForm depth={(depth || 0) + 1} target={comment._id} /> }
          </div>
        </div>
      ))}
    </div>
  );
}
