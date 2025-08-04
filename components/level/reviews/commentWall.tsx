import { Types } from 'mongoose';
import { useContext, useEffect, useState } from 'react';
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
    <div className='bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl p-6 w-full'>
      <h2 className='text-2xl font-bold text-white mb-6 flex items-center gap-3'>
        <span>💬</span>
        Comments
        {totalRows > 0 && (
          <span className='text-sm font-normal text-gray-400'>({totalRows})</span>
        )}
      </h2>
      
      {user && (
        <div className='mb-6'>
          <div className='bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4'>
            <ReactTextareaAutosize
              className='w-full bg-transparent text-white placeholder-gray-400 resize-none focus:outline-none'
              onChange={(e) => setText(e.currentTarget.value)}
              placeholder='Share your thoughts...'
              value={text}
              minRows={3}
            />
            {text.length !== 0 && (
              <div className='flex gap-3 mt-3 pt-3 border-t border-white/10'>
                <button
                  className='group relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed'
                  disabled={isUpdating || (text?.length === 0 || text?.length > 500)}
                  onClick={onPostComment}
                >
                  <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-700' />
                  <div className='relative flex items-center gap-2'>
                    <span>💾</span>
                    <span>Save</span>
                  </div>
                </button>
                <button
                  className='bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300'
                  onClick={() => setText('')}
                >
                  Cancel
                </button>
                <div className='ml-auto text-xs text-gray-400 self-center'>
                  {text.length}/500
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className='space-y-4'>
        {!comments ? (
          <div className='text-center py-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4'></div>
            <span className='text-gray-400'>Loading comments...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className='text-center py-8'>
            <div className='text-4xl mb-4'>🤔</div>
            <span className='text-gray-400'>No comments yet! Be the first to share your thoughts.</span>
          </div>
        ) : (
          comments.map((comment, index) => (
            <div 
              className='animate-fadeInUp' 
              key={`comment-${comment._id.toString()}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
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
        )}
      </div>
      
      {totalRows > COMMENT_QUERY_LIMIT && !isUpdating && (
        <div className='flex justify-center gap-4 mt-6 pt-6 border-t border-white/10'>
          {page > 0 && (
            <button
              className='bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 flex items-center gap-2'
              onClick={() => onShowMore(page - 1)}
            >
              <span>←</span>
              <span>Previous</span>
            </button>
          )}
          {totalRows > COMMENT_QUERY_LIMIT * (page + 1) && (
            <button
              className='bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 flex items-center gap-2'
              onClick={() => onShowMore(page + 1)}
            >
              <span>Next</span>
              <span>→</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
