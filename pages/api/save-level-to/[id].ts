import { createNewLevelAddedToCollectionNotification } from '@root/helpers/notificationHelper';
import Collection from '@root/models/db/collection';
import type { NextApiResponse } from 'next';
import { ValidArray, ValidObjectId } from '../../../helpers/apiWrapper';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import { CollectionModel, LevelModel } from '../../../models/mongoose';

export default withAuth({
  PUT: {
    query: {
      id: ValidObjectId(true),
    },
    body: {
      collectionIds: ValidArray(true),
    },
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  const { id } = req.query;
  const { collectionIds } = req.body;
  const level = await LevelModel.findOne<Level>({
    _id: id,
    isDeleted: { $ne: true },
    // filter out draft levels unless the userId matches req.user._id
    $or: [
      { isDraft: false },
      {
        $and: [
          { isDraft: true },
          { userId: req.user._id },
        ]
      }
    ],
  });

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  const count = await CollectionModel.countDocuments({ _id: { $in: collectionIds } });

  if (count !== collectionIds.length) {
    return res.status(400).json({
      error: 'Collection id not found',
    });
  }

  const promises = [];

  // if it's not your own level, notify others that the level has been added to your collection
  if (level.userId.toString() !== req.userId) {
    // find public collections that are newly added due to this request
    const notifyCollections = await CollectionModel.find<Collection>({
      _id: { $in: collectionIds },
      isPrivate: { $ne: true },
      levels: { $nin: id },
      userId: req.userId,
    }, {
      _id: 1,
    }).lean<Collection[]>();

    const notifyCollectionIds = notifyCollections.map(c => c._id.toString());

    promises.push(createNewLevelAddedToCollectionNotification(req.user, level, notifyCollectionIds));
  }

  promises.push(
    CollectionModel.updateMany({
      _id: { $in: collectionIds },
      userId: req.userId,
    }, {
      $addToSet: {
        levels: id,
      },
    }),
    CollectionModel.updateMany({
      _id: { $nin: collectionIds },
      levels: id,
      userId: req.userId,
    }, {
      $pull: {
        levels: id,
      },
    }),
  );

  await Promise.all(promises);

  return res.status(200).json(level);
});
