import classNames from 'classnames';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import GraphType from '../constants/graphType';
import User from '../models/db/user';
import { FollowData } from '../pages/api/follow';

interface FollowButtonProps {
  isFollowingInit: boolean;
  onResponse?: (followData: FollowData) => void;
  user: User;
}

export default function FollowButton({ isFollowingInit, onResponse, user }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState<boolean>(isFollowingInit);

  const onFollowButtonPress = async (ele: React.MouseEvent<HTMLButtonElement>) => {
    // disable button and make it opacity 0.5
    const targ = ele.currentTarget;

    targ.disabled = true;
    targ.style.opacity = '0.5';

    const res = await fetch('/api/follow', {
      method: !isFollowing ? 'PUT' : 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',

      body: JSON.stringify({
        action: GraphType.FOLLOW,
        id: user._id,
        targetModel: 'User',
      }),
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

  if (isFollowing === undefined) {
    return null;
  }

  return (
    <button className={classNames(
      'font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer',
      isFollowing ? 'bg-button' : 'bg-blue-500 hover:bg-blue-700 text-white',
    )} onClick={onFollowButtonPress}>
      {!isFollowing ? 'Follow' : 'Unfollow'}
    </button>
  );
}
