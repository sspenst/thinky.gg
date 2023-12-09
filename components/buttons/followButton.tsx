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

    fetch(`/api/follow?${queryParams}`, {
      method: !_isFollowing ? 'PUT' : 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    }).then(async res => {
      if (res.status !== 200) {
        throw res.text();
      }

      const resp: FollowData = await res.json();

      setIsFollowing(!!resp.isFollowing);

      if (onResponse) {
        onResponse(resp);
      }
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error ?? 'Something went wrong following this user');
    }).finally(() => {
      setDisabled(false);
    });
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
