import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import User from '../models/db/user';

interface FollowButtonProps {
    reqUserFollowing: boolean,
    user: User;
    onResponse?: (isFollowing: boolean, followerCount: number) => void;
}

export default function FollowButton({ reqUserFollowing, user, onResponse }: FollowButtonProps) {
  const [followState, setFollowState] = useState(reqUserFollowing);

  const followBtnClass = followState ? 'bg-blue-600' : 'bg-green-600';
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
    <button onClick={onFollowButtonPress} className={`btn btn-primary ${followBtnClass} px-2 py-1 text-xl rounded`}>
      {!followState ? 'Follow' : 'Unfollow'}
    </button>
  );
}
