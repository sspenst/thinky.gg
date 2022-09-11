import classNames from 'classnames';
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import User from '../models/db/user';

interface FollowButtonProps {
  onResponse?: (isFollowing: boolean, followerCount: number) => void;
  reqUserFollowing: boolean;
  user: User;
}

export default function FollowButton({ onResponse, reqUserFollowing, user }: FollowButtonProps) {
  const [followState, setFollowState] = useState(reqUserFollowing);

  const onFollowButtonPress = async (ele: React.MouseEvent<HTMLButtonElement>) => {
    // disable button and make it opacity 0.5
    const targ = ele.currentTarget;

    targ.disabled = true;
    targ.style.opacity = '0.5';

    const res = await fetch('/api/follow', {
      method: !followState ? 'PUT' : 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',

      body: JSON.stringify({
        action: 'follow',
        id: user._id,
        targetType: 'user',
      }),
    });

    targ.disabled = false;
    targ.style.opacity = '1';

    if (res.status === 200) {
      const resp = await res.json();

      setFollowState(resp.isFollowing);

      if (onResponse) {
        onResponse(resp.isFollowing, resp.followerCount);
      }
    } else {
      toast.dismiss();
      toast.error('Something went wrong following this user');
    }
  };

  return (
    <button className={classNames(
      'font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer',
      followState ? 'bg-button' : 'bg-blue-500 hover:bg-blue-700 text-white',
    )} onClick={onFollowButtonPress}>
      {!followState ? 'Follow' : 'Unfollow'}
    </button>
  );
}
