import classNames from 'classnames';
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import GraphType from '../../constants/graphType';
import User from '../../models/db/user';
import { FollowData } from '../../pages/api/follow';

interface FollowButtonProps {
  isFollowing: boolean;
  onResponse?: (followData: FollowData) => void;
  user: User;
}

export default function FollowButton({ isFollowing, onResponse, user }: FollowButtonProps) {
  const [_isFollowing, setIsFollowing] = useState(isFollowing);
  const [disabled, setDisabled] = useState(false);

  const onFollowButtonPress = async () => {
    setDisabled(true);

    const queryParams = new URLSearchParams({
      action: GraphType.FOLLOW,
      id: user._id.toString(),
      targetModel: 'User',
    });

    const res = await fetch(`/api/follow?${queryParams}`, {
      method: !_isFollowing ? 'PUT' : 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (res.status === 200) {
      const resp: FollowData = await res.json();

      setIsFollowing(!!resp.isFollowing);

      if (onResponse) {
        onResponse(resp);
      }
    } else {
      toast.dismiss();
      toast.error('Something went wrong following this user');
    }

    setDisabled(false);
  };

  return (
    <button
      className={classNames(
        'font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50',
        _isFollowing ? 'bg-button' : 'bg-blue-500 hover:bg-blue-700 text-white',
      )}
      disabled={disabled}
      onClick={onFollowButtonPress}
    >
      {!_isFollowing ? 'Follow' : 'Unfollow'}
    </button>
  );
}
