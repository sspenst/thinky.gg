import DidYouKnowTip from '@root/components/page/didYouKnowTip';
import useHomePageData, { HomepageDataType } from '@root/hooks/useHomePageData';
import Collection from '@root/models/db/collection';
import Level, { EnrichedLevel } from '@root/models/db/level';
import User from '@root/models/db/user';
import React from 'react';
import RecommendedLevel from '../homepage/recommendedLevel';
import Modal from '.';

interface PostGameModalProps {
  closeModal: () => void;
  collection?: Collection;
  isOpen: boolean;
  level: Level;
  reqUser: User;
}

export default function PostGameModal({ closeModal, collection, isOpen, level, reqUser }: PostGameModalProps) {
  const header = (
    <div className='flex flex-col gap-1'>
      <h3 className='text-center text-2xl p-1'>
        Congratulations!
      </h3>
      <h4 className='text-md'>
        You completed {level.name}!
      </h4>
    </div>
  );

  let nextLevel: EnrichedLevel | undefined = undefined;

  if (collection && collection.levels) {
    const levelIndex = collection.levels.findIndex((l) => l._id === level._id);

    if (levelIndex + 1 < collection.levels.length) {
      nextLevel = collection.levels[levelIndex + 1] as EnrichedLevel;
    }
  }

  const [queryParameters, setQueryParameters] = React.useState({});
  const { data } = useHomePageData([HomepageDataType.RecommendedLevel], nextLevel !== undefined);
  const recommendedLevel = data && data[HomepageDataType.RecommendedLevel];

  React.useEffect(() => {
    const queryParameters = new URLSearchParams(window.location.search);

    setQueryParameters(queryParameters);
  }, []);

  let allQueryParametersToString = '';

  if (queryParameters) {
    allQueryParametersToString = queryParameters.toString();
  }

  const href = nextLevel ? `/level/${nextLevel.slug}?${allQueryParametersToString}` : '/';

  return (
    <Modal title={header} closeModal={closeModal} isOpen={isOpen} >
      <div className='flex flex-col gap-4 justify-center items-center'>
        <RecommendedLevel hrefOverride={href} onClick={closeModal} id='next-level' title={nextLevel ? 'Next Level' : 'Try this next!'} level={nextLevel ?? recommendedLevel} />
        <DidYouKnowTip reqUser={reqUser} />
      </div>
    </Modal>
  );
}
