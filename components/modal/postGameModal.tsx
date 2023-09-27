import { AppContext } from '@root/contexts/appContext';
import useHomePageData, { HomepageDataType } from '@root/hooks/useHomePageData';
import Collection from '@root/models/db/collection';
import Level from '@root/models/db/level';
import User from '@root/models/db/user';
import next from 'next';
import React, { useContext } from 'react';
import RecommendedLevel from '../homepage/recommendedLevel';
import DidYouKnowTip from '../page/DidYouKnowTip';
import Modal from '.';

interface PostGameModalProps {
    reqUser: User
    level: Level
    collection?: Collection
    closeModal: () => void;
    isOpen: boolean;
}

export default function PostGameModal({ reqUser, level, collection, closeModal, isOpen }: PostGameModalProps) {
  const header = <div className='flex flex-col gap-1'><h1 className='text-center text-2xl p-1'>Congratulations!</h1><h2 className='text-md'>You completed {level.name}!</h2></div>;
  let nextLevel = undefined;

  if (collection) {
    if (collection.levels) {
      const levelIndex = collection.levels.findIndex((l) => l._id === level._id);

      if (levelIndex + 1 < collection.levels.length) {
        const next = collection.levels[levelIndex + 1];

        nextLevel = <RecommendedLevel title={'Next level'} level={next} />;
      }
    }
  }

  const { data: dataMerge } = useHomePageData([HomepageDataType.RecommendedLevel], nextLevel !== undefined);

  const recommendedLevel = dataMerge && dataMerge[HomepageDataType.RecommendedLevel];

  return (
    <Modal title={header} closeModal={closeModal} isOpen={isOpen} >
      <div className='flex flex-col gap-2 justify-center items-center'>
        {recommendedLevel && <RecommendedLevel title={'Try this next!'} level={recommendedLevel} />}
        {nextLevel && nextLevel}
        <DidYouKnowTip reqUser={reqUser} />

      </div>
    </Modal>
  );
}
