import React from 'react';
import getFormattedDate from '../../helpers/getFormattedDate';
import Level from '../../models/db/level';
import Notification from '../../models/db/notification';
import User from '../../models/db/user';
import FormattedUser from '../formattedUser';

export default function FollowedUserPublishedLevelNotification({ notification }: {notification: Notification}): JSX.Element {
  return <div className="w-full p-3 mt-3 bg-white rounded shadow flex flex-shrink-0">
    <div className=''><FormattedUser user={notification.source as User} /></div>
    <div className="pl-3 mt-3 w-full">
      <div className="flex items-center justify-between w-full">
        <p className="focus:outline-none text-sm leading-none">
          published a new level {(notification.target as Level).name}
        </p>
        <div aria-label="close icon" role="button" className="focus:outline-none cursor-pointer">

        </div>
      </div>
      <p className="focus:outline-none text-xs leading-3 pt-1 text-gray-500">{getFormattedDate(new Date(notification.createdAt).getTime() / 1000)}</p>
    </div>
  </div>;
}
