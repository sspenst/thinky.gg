import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import ReportModal from '@root/components/modal/reportModal';
import { ReportType } from '@root/constants/ReportType';
import { PageContext } from '@root/contexts/pageContext';
import classNames from 'classnames';
import { Types } from 'mongoose';
import React, { Fragment, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ReactTextareaAutosize from 'react-textarea-autosize';
import { KeyedMutator } from 'swr';
import { AppContext } from '../../../contexts/appContext';
import { COMMENT_QUERY_LIMIT } from '../../../models/constants/comment';
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
  const { user } = useContext(AppContext);
  const { setModal } = useContext(PageContext);
  const modal = <ReportModal targetId={comment._id.toString()} reportType={ReportType.COMMENT} />;
  const reportComment = async () => {
    setModal(modal);
  };

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
        { user && comment.author._id !== user._id && <Menu as='div' className='relative'>
          <MenuButton className='flex items-center' id='dropdownMenuBtn' aria-label='dropdown menu'>
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6 hover:opacity-100 opacity-50'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z' />
            </svg>
          </MenuButton>
          <Transition
            as={Fragment}
            enter='transition ease-out duration-100'
            enterFrom='transform opacity-0 scale-95'
            enterTo='transform opacity-100 scale-100'
            leave='transition ease-in duration-75'
            leaveFrom='transform opacity-100 scale-100'
            leaveTo='transform opacity-0 scale-95'
          >
            <MenuItems className='absolute right-0 m-1 w-fit origin-top-right rounded-[10px] shadow-lg border z-20 bg-1 border-color-3'>
              <MenuItem>
                {({ active }) => (
                  <div
                    className={classNames('flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3 text-yellow-500')}
                    onClick={() => {
                      reportComment();
                    }}
                    style={{
                      backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                    }}
                  >
                    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-exclamation-triangle' viewBox='0 0 16 16'>
                      <path d='M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.15.15 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.2.2 0 0 1-.054.06.1.1 0 0 1-.066.017H1.146a.1.1 0 0 1-.066-.017.2.2 0 0 1-.054-.06.18.18 0 0 1 .002-.183L7.884 2.073a.15.15 0 0 1 .054-.057m1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767z' />
                      <path d='M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z' />
                    </svg>
                  Report
                  </div>
                )}
              </MenuItem>
            </MenuItems>
          </Transition>
        </Menu>
        }
        {(comment.author._id.toString() === user?._id.toString() || (user?._id === comment.target)) && (
          <button
            className='text-white font-bold p-1 rounded-lg text-sm disabled:opacity-25 '
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
          className='gray hover-color w-fit text-xs ml-auto'
          onClick={() => setReply(true)}
        >
          Reply
        </button>
        :
        <div className='flex flex-col gap-2'>
          <ReactTextareaAutosize
            onChange={(e) => setText(e.currentTarget.value)}
            placeholder='Reply...'
            value={text}
          />
          <div className='flex gap-2'>
            <button
              className='bg-blue-500 enabled:hover:bg-blue-700 text-white font-medium px-3 py-2 rounded-full text-sm disabled:opacity-50 w-fit'
              disabled={isUpdating || (text.length === 0 || text.length > 500)}
              onClick={onReplyComment}
            >
              Reply
            </button>
            <button
              className='enabled:hover:bg-neutral-500 font-medium px-3 py-2 mr-2 rounded-full text-sm disabled:opacity-50 w-fit'
              onClick={() => {
                setReply(false);
                setText('');
              }}
            >
              Cancel
            </button>
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
