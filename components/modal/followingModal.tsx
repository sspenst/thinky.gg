import Dimensions from '@root/constants/dimensions';
import User from '@root/models/db/user';
import { IsFollowingGraph } from '@root/pages/[subdomain]/profile/[name]/[[...tab]]';
import FollowButton from '../buttons/followButton';
import FormattedUser from '../formatted/formattedUser';
import Modal from '.';

interface FollowingModalProps {
  closeModal: () => void;
  following: IsFollowingGraph[];
  isOpen: boolean;
}

export default function FollowingModal({ closeModal, following, isOpen }: FollowingModalProps) {
  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={`${following.length} following`}
    >
      <div className='flex flex-col gap-2'>
        {following.map((follower) => (
          <div className='flex justify-between gap-x-4' key={`follower-${follower.target._id}`}>
            <FormattedUser id='following' size={Dimensions.AvatarSizeSmall} user={follower.target as User} />
            <FollowButton isFollowing={follower.isFollowing} user={follower.target as User} />
          </div>
        ))}
      </div>
    </Modal>
  );
}
