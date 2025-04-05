import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import GraphType from '../../constants/graphType';
import User from '../../models/db/user';

type BlockButtonProps = {
  isBlocked: boolean;
  user: User;
  onBlockStatusChange?: (isBlocked: boolean) => void;
};

export default function BlockButton({ isBlocked, user, onBlockStatusChange }: BlockButtonProps) {
  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const [isUserBlocked, setIsUserBlocked] = useState(isBlocked);
  const router = useRouter();

  const toggleBlock = async () => {
    if (!user._id) return;

    setIsBlockLoading(true);

    try {
      const method = isUserBlocked ? 'DELETE' : 'PUT';
      const newBlockStatus = !isUserBlocked;

      // Set UI state immediately for better perceived performance
      setIsUserBlocked(newBlockStatus);

      const res = await fetch(`/api/follow?action=${GraphType.BLOCK}&id=${user._id}&targetModel=User`, {
        method,
      });

      if (!res.ok) {
        const data = await res.json();

        // Revert UI state if request failed
        setIsUserBlocked(isUserBlocked);
        throw new Error(data.error || 'Failed to update block status');
      }

      if (onBlockStatusChange) {
        onBlockStatusChange(newBlockStatus);
      }

      toast.success(newBlockStatus ? `Blocked ${user.name}` : `Unblocked ${user.name}`);

      // If we're unblocking on the profile page, refresh to show content
      if (!newBlockStatus && router.pathname.includes('/profile/')) {
        router.reload();
      }
    } catch (error) {
      console.error('Error toggling block:', error);
      toast.error((error as Error).message || 'Failed to update block status');
    } finally {
      setIsBlockLoading(false);
    }
  };

  return (
    <button
      onClick={toggleBlock}
      disabled={isBlockLoading}
      className={`px-4 py-2 rounded-md ${isUserBlocked
        ? 'bg-gray-600 hover:bg-gray-700'
        : 'bg-red-600 hover:bg-red-700'} text-white transition-colors`}
    >
      {isBlockLoading ? 'Loading...' : isUserBlocked ? 'Unblock' : 'Block'}
    </button>
  );
}
