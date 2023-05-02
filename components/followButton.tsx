import classNames from 'classnames';
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import GraphType from '../constants/graphType';
import User from '../models/db/user';
import { FollowData } from '../pages/api/follow';

interface FollowButtonProps {
  isFollowing: boolean;
  onResponse?: (followData: FollowData) => void;
  user: User;
}

export default function FollowButton({ isFollowing, onResponse, user }: FollowButtonProps) {
  const [_isFollowing, setIsFollowing] = useState<boolean>(isFollowing);

  const onFollowButtonPress = async (ele: React.MouseEvent<HTMLButtonElement>) => {
    // disable button and make it opacity 0.5
    const targ = ele.currentTarget;

    targ.disabled = true;
    targ.style.opacity = '0.5';

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

    targ.disabled = false;
    targ.style.opacity = '1';

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
  };

  return (
    <button className={classNames(
      'font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer',
      _isFollowing ? 'bg-button' : 'bg-blue-500 hover:bg-blue-700 text-white',
    )} onClick={onFollowButtonPress}>
      {!_isFollowing ? 'Follow' : 'Unfollow'}
    </button>
  );
}
