import classNames from 'classnames';
import React, { useContext } from 'react';
import Dimensions from '../constants/dimensions';
import { AppContext } from '../contexts/appContext';
import isOnline from '../helpers/isOnline';
import User from '../models/db/user';

interface AvatarProps {
  hideStatusCircle?: boolean;
  size?: number;
  user: User;
}

export default function Avatar({ hideStatusCircle, size, user }: AvatarProps) {
  const { multiplayerSocket } = useContext(AppContext);
  const connectedUser = multiplayerSocket.connectedPlayers.find(u => u._id === user._id);
  const _size = size ?? Dimensions.AvatarSize;
  const borderWidth = Math.round(_size / 40) || 1;

  return (
    <div className='flex items-end'>
      <span
        className='border'
        style={{

          backgroundImage: user.avatarUpdatedAt ? `url("/api/avatar/${user._id}.png?ts=${user.avatarUpdatedAt}")` : 'url("/avatar_default.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderColor: 'var(--bg-color-3)',
          borderRadius: _size / 2,
          height: _size,
          width: _size,

        }}
      />
      {!hideStatusCircle && (<>
        <div
          className={classNames(
            !connectedUser ? 'bg-neutral-500' :
              isOnline(connectedUser) ? 'bg-green-500' : 'bg-yellow-500')}
          style={{
            borderColor: 'var(--bg-color)',
            borderRadius: _size / 6,
            borderWidth: borderWidth,
            height: _size / 3,
            marginLeft: -(_size / 3),
            width: _size / 3,
          }}
        >
          {connectedUser && !isOnline(connectedUser) &&
            <div
              className='overflow-hidden'
              style={{
                height: _size / 3,
                borderRadius: _size / 6,
                marginLeft: -borderWidth,
                marginTop: -borderWidth,
                width: _size / 3,
              }}
            >
              <span
                className='block'
                style={{
                  backgroundColor: 'var(--bg-color)',
                  borderRadius: _size / 9,
                  height: _size / 4.5,
                  width: _size / 4.5,
                }}
              />
            </div>
          }
        </div>
      </>)}
    </div>
  );
}
