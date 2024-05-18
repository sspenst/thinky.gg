import Dimensions from '@root/constants/dimensions';
import User from '@root/models/db/user';
import { IsFollowingGraph } from '@root/pages/[subdomain]/profile/[name]/[[...tab]]';
import React from 'react';
import FollowButton from '../buttons/followButton';
import FormattedUser from '../formatted/formattedUser';
import Modal from '.';

interface FollowerModalProps {
  closeModal: () => void;
  followers: IsFollowingGraph[];
  isOpen: boolean;
}

export default function FollowerModal({ closeModal, followers, isOpen }: FollowerModalProps) {
  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={`${followers.length} follower${followers.length === 1 ? '' : 's'}`}
    >
      <div className='flex flex-col gap-2'>
        {followers.map((follower) => (
          <div className='flex justify-between gap-x-4' key={`follower-${follower.source._id}`}>
            <FormattedUser id='following' onClick={closeModal} size={Dimensions.AvatarSizeSmall} user={follower.source as User} />
            <FollowButton isFollowing={follower.isFollowing} user={follower.source as User} />
          </div>
        ))}
      </div>
    </Modal>
  );
}
