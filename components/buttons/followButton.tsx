import { AppContext } from '@root/contexts/appContext';
import classNames from 'classnames';
import { useContext, useState } from 'react';
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
  const { user: reqUser } = useContext(AppContext);

  if (!reqUser || reqUser._id === user._id) {
    return null;
  }

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
        'group relative overflow-hidden font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 focus:outline-none focus:shadow-outline disabled:opacity-50',
        _isFollowing
          ? 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white'
          : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white',
      )}
      disabled={disabled}
      onClick={onFollowButtonPress}
    >
      <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-700' />
      <div className='relative flex items-center gap-2'>
        <span>{_isFollowing ? '👥' : '➕'}</span>
        <span>{!_isFollowing ? 'Follow' : 'Unfollow'}</span>
      </div>
    </button>
  );
}
