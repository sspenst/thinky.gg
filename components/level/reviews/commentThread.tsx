import classNames from 'classnames';
import { Types } from 'mongoose';
import React, { useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { KeyedMutator } from 'swr';
import Theme from '../../../constants/theme';
import { AppContext } from '../../../contexts/appContext';
import { COMMENT_QUERY_LIMIT } from '../../../models/CommentEnums';
import { EnrichedComment } from '../../../models/db/comment';
import { CommentQuery } from '../../../pages/api/comment/[id]';
import FormattedDate from '../../formatted/formattedDate';
import FormattedUser from '../../formatted/formattedUser';
import isNotFullAccountToast from '../../toasts/isNotFullAccountToast';

interface CommentProps {
  className?: string;
  comment: EnrichedComment;
  mutateComments: KeyedMutator<CommentQuery>;
  onServerUpdate?: (data: {totalRows: number, data: EnrichedComment[]}) => void;
  replies?: EnrichedComment[];
  target: Types.ObjectId;
}

export default function CommentThread({ className, comment, mutateComments, onServerUpdate, target }: CommentProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const queryCommentId = useRef('');
  const [replies, setReplies] = useState<EnrichedComment[]>(comment.replies || []);
  const [reply, setReply] = useState(false);
  const [text, setText] = useState('');
  const [totalRows, setTotalRows] = useState(comment.totalReplies || 0);
  const [page, setPage] = useState(0);
  const { theme, user } = useContext(AppContext);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const commentId = urlParams.get('commentId');

    queryCommentId.current = commentId || '';

    if (commentId) {
      const anchorTarget = document.getElementById('comment-div-' + commentId);

      if (anchorTarget)
        anchorTarget.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, []);

  function onDeleteComment() {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setIsUpdating(true);

    toast.dismiss();
    toast.loading('Deleting...');

    fetch('/api/comment/' + comment._id, {
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
        setReplies([]);
        setTotalRows(0);
        setPage(0);

        if (onServerUpdate) {
          const resp = await res.json();

          onServerUpdate(resp);
        }

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

  function onReplyComment() {
    setIsUpdating(true);

    toast.dismiss();
    toast.loading('Saving...');

    fetch('/api/comment/' + target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        targetModel: 'Comment',
      })
    }).then(async(res) => {
      if (res.status === 401) {
        isNotFullAccountToast('Commenting');
      } else if (res.status !== 200) {
        const resp = await res.json();

        toast.dismiss();
        toast.error(resp?.error || 'Error saving comment');
      } else {
        const resp = await res.json();

        // replying to the base comment
        if (target.toString() === comment._id.toString()) {
          const totalRows = resp.metadata?.totalRows as number ?? 0;

          setReplies(resp.data);
          setTotalRows(totalRows);
          setPage(-1 + Math.ceil(totalRows / resp.data.length));
        } else if (onServerUpdate) {
          onServerUpdate(resp);
        }

        toast.dismiss();
        toast.success('Saved');
        setText('');
        setReply(false);
      }
    }).catch(() => {
      mutateComments();
      toast.dismiss();
      toast.error('Error saving comment');
    }).finally(() => {
      setIsUpdating(false);
    });
  }

  function onShowMore(page: number, commentId?: string) {
    setPage(page);
    setIsUpdating(true);

    fetch(`/api/comment/get?${new URLSearchParams({
      id: commentId ?? target.toString(),
      page: page.toString(),
      targetModel: commentId ? 'Comment' : 'User',
    })}`, {
      method: 'GET',
    }).then(async(res) => {
      if (res.status !== 200) {
        const resp = await res.json();

        toast.dismiss();
        toast.error(resp?.error || 'Error fetching comments');
      } else {
        const resp = await res.json();

        if (resp?.comments) {
          setReplies(resp.comments);
          setTotalRows(resp.totalRows);
        }
      }
    }).catch(() => {
      toast.error('Error fetching comments');
    }).finally(() => {
      setIsUpdating(false);
    });
  }

  return (<>
    <div
      className={classNames('flex flex-col gap-1 rounded-lg', { 'flashBackground': queryCommentId.current.length > 0 && comment._id.toString() === queryCommentId.current.toString() }, className)}
      id={'comment-div-' + comment._id}
    >
      <div className='flex justify-between gap-2'>
        <div className='flex gap-x-2 items-center truncate'>
          <FormattedUser id={`comment-${comment._id.toString()}`} user={comment.author} />
          {comment.createdAt !== comment.updatedAt &&
            <span className='text-sm' style={{
              color: 'var(--color-gray)',
            }}>
              {'*Edited*'}
            </span>
          }
          <FormattedDate date={comment.createdAt} />
        </div>
        {(comment.author._id.toString() === user?._id.toString() || (user?._id === comment.target)) && (
          <button
            className='text-xs text-white font-bold p-1 rounded-lg text-sm disabled:opacity-25 '
            disabled={isUpdating}
            onClick={onDeleteComment}
          >
            X
          </button>
        )}
      </div>
      <span className='break-words'>{comment.text}</span>
      {!user ? null : !reply ?
        <button
          className='font-semibold underline w-fit text-xs ml-auto'
          onClick={() => setReply(true)}
        >
          Reply
        </button>
        :
        <div className='flex flex-col gap-2'>
          <textarea
            className={classNames(
              'block p-1 w-full rounded-lg border disabled:opacity-25',
              theme === Theme.Light ?
                'bg-gray-100 focus:ring-blue-500 focus:border-blue-500 border-gray-300' :
                'bg-gray-700 border-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
            )}
            disabled={isUpdating}
            onChange={(e) => setText(e.currentTarget.value)}
            placeholder='Reply...'
            minLength={1}
            rows={1}
            value={text}
          />
          <div className='flex flex-row gap-2'>
            <button
              className='bg-blue-500 hover:bg-blue-700 text-white font-bold p-2 w-fit rounded-lg text-xs focus:bg-blue-800 disabled:opacity-25'
              disabled={isUpdating || (text.length === 0 || text.length > 500)}
              onClick={onReplyComment}
            >
              Reply
            </button>
            <button
              className='font-semibold underline w-fit text-sm'
              onClick={() => {
                setReply(false);
                setText('');
              }}
            >
              Cancel
            </button>
            <span className='text-xs my-2'>{text.length > 500 ? text.length + '/500 characters' : ''}</span>
          </div>
        </div>
      }
    </div>
    {replies.map(reply => (
      <CommentThread
        className='ml-8'
        comment={reply}
        key={`comment-reply-${reply._id.toString()}`}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onServerUpdate={(resp: any) => {
          const totalRows = resp.metadata?.totalRows as number ?? 0;

          setReplies(resp.data);
          setTotalRows(totalRows);
          setPage(-1 + (Math.ceil(totalRows / resp.data.length)));
        }}
        mutateComments={mutateComments}
        target={comment._id}
      />
    ))}
    {totalRows > COMMENT_QUERY_LIMIT && !isUpdating && (
      <div className='flex flex-row gap-2 ml-8'>
        {page > 0 &&
          <button
            className='font-semibold underline w-fit text-xs'
            onClick={() => onShowMore(page - 1, comment._id.toString())}
          >
            Prev replies
          </button>
        }
        {totalRows > COMMENT_QUERY_LIMIT * (page + 1) &&
          <button
            className='font-semibold underline w-fit text-xs'
            onClick={() => onShowMore(page + 1, comment._id.toString())}
          >
            Next replies
          </button>
        }
      </div>
    )}
  </>);
}
