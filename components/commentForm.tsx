import { ObjectId } from 'bson';
import classNames from 'classnames';
import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Theme from '../constants/theme';
import { PageContext } from '../contexts/pageContext';
import getFormattedDate from '../helpers/getFormattedDate';
import useComments from '../hooks/useComments';
import FormattedUser from './formattedUser';

interface CommentFormProps {
  inModal?: boolean;
  target: ObjectId;
  depth?: number;
}

export default function CommentForm({ inModal, target, depth = 0 }: CommentFormProps) {
  const [isDeleteCommentOpen, setIsDeleteCommentOpen] = useState(false);
  const { comments, mutateComments } = useComments(target);

  const [isUpdating, setIsUpdating] = useState(false);
  const [text, setText] = useState('');
  const { setPreventKeyDownEvent, user } = useContext(PageContext);

  // only prevent keydown when the delete modal is the first modal open
  // (not opened from within the review modal)
  useEffect(() => {
    if (!inModal) {
      setPreventKeyDownEvent(isDeleteCommentOpen);
    }
  }, [inModal, isDeleteCommentOpen, setPreventKeyDownEvent]);

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
    <div className='' style={{
      borderColor: 'var(--bg-color-4)',
    }}>
      <div>
        <textarea
          className={classNames(
            'block p-1 my-2 w-full rounded-lg border disabled:opacity-25',
            document.body.classList.contains(Theme.Light) ?
              'bg-gray-100 focus:ring-blue-500 focus:border-blue-500 border-gray-300' :
              'bg-gray-700 border-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
          )}
          disabled={isUpdating}
          onBlur={() => setPreventKeyDownEvent(false)}
          onFocus={() => setPreventKeyDownEvent(true)}
          onChange={(e) => setText(e.currentTarget.value)}
          placeholder='Add comment...'
          rows={1}
          value={text}
        />
        <div className='text-right'>
          <button
            className='bg-blue-500 hover:bg-blue-700 text-white font-bold p-2 mr-2 rounded-lg text-xs focus:bg-blue-800 disabled:opacity-25'
            disabled={isUpdating || (text?.length === 0)}
            onClick={() => onPostComment(target)}>
            {depth === 0 ? 'Post' : 'Reply'}
          </button>
        </div>
      </div>
      <div className='mt-2'>
        {comments?.map((comment) => (
          <div
            className='text-left flex flex-col p-1 my-2 rounded-lg'
            key={comment._id.toString()}
            style={{
              backgroundColor: 'var(--bg-color-4)',
            }}>

            <div className='flex justify-between'>

              <FormattedUser user={comment.author} />
              <div className='flex'>
                <div className='text-xs italic text-right float-right mt-1 mr-2'>{getFormattedDate(new Date(comment.createdAt).getTime() / 1000)}</div>
                { comment.author._id.toString() === user._id.toString() && (
                  <div className='text-right'>
                    <button
                      className='text-xs  text-white font-bold p-1  rounded-lg text-sm  disabled:opacity-25'
                      disabled={isUpdating}
                      onClick={() => onDeleteComment(comment._id)}>
                X
                    </button>
                  </div>
                )}
              </div>
            </div>
            {comment.text}

            <div style={{ paddingLeft: 20 }} >
              {depth <= 0 && <CommentForm depth={(depth || 0) + 1} target={comment._id} inModal={true} /> }
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
