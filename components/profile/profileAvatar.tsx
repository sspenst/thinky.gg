import classNames from 'classnames';
import React, { useContext } from 'react';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import isOnline from '../../helpers/isOnline';
import User from '../../models/db/user';

interface ProfileAvatarProps {
  hideStatusCircle?: boolean;
  size?: number;
  user: User;
}

export default function ProfileAvatar({ hideStatusCircle, size = Dimensions.AvatarSize, user }: ProfileAvatarProps) {
  const { multiplayerSocket } = useContext(AppContext);
  const connectedUser = multiplayerSocket.connectedPlayers.find(u => u._id === user._id);
  const borderWidth = Math.round(size / 40) || 1;

  return (
    <div className='flex items-end'>
      <span
        className='border'
        style={{
          backgroundImage: user.avatarUpdatedAt ? `url("/api/avatar/${user._id}.png?ts=${user.avatarUpdatedAt}")` : 'url("/avatar_default.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderColor: 'var(--bg-color-3)',
          borderRadius: size / 2,
          height: size,
          width: size,
        }}
      />
      {!hideStatusCircle && (<>
        <div
          className={classNames(
            !connectedUser ? 'bg-neutral-500' :
              isOnline(connectedUser) ? 'bg-green-500' : 'bg-yellow-500')}
          style={{
            borderColor: 'var(--bg-color)',
            borderRadius: size / 6,
            borderWidth: borderWidth,
            height: size / 3,
            marginLeft: -(size / 3),
            width: size / 3,
          }}
        >
          {connectedUser && !isOnline(connectedUser) &&
            <div
              className='overflow-hidden'
              style={{
                height: size / 3,
                borderRadius: size / 6,
                marginLeft: -borderWidth,
                marginTop: -borderWidth,
                width: size / 3,
              }}
            >
              <span
                className='block'
                style={{
                  backgroundColor: 'var(--bg-color)',
                  borderRadius: size / 9,
                  height: size / 4.5,
                  width: size / 4.5,
                }}
              />
            </div>
          }
        </div>
      </>)}
    </div>
  );
}
