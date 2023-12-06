import { ValidObjectId } from '@root/helpers/apiWrapper';
import isPro from '@root/helpers/isPro';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { CollectionType } from '@root/models/constants/collection';
import Collection from '@root/models/db/collection';
import Level from '@root/models/db/level';
import { CollectionModel, LevelModel } from '@root/models/mongoose';
import { NextApiResponse } from 'next';

export const MAX_LEVELS_IN_PLAY_LATER = process.env.NODE_ENV !== 'test' ? 500 : 2;

export default withAuth(
  {
    GET: {},
    POST: {
      body: {
        id: ValidObjectId(),
      },
    },
    DELETE: {
      body: {
        id: ValidObjectId(),
      },
    },
  }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
    if (!isPro(req.user)) {
      return res.status(401).json({ error: 'You must be a Pro user to use this feature.' });
    }

    if (req.method === 'GET') {
      const playLater = await CollectionModel.aggregate([
        {
          $match: {
            userId: req.user._id,
            type: CollectionType.PlayLater,
          }
        },
        {
          $project: {
            levels: 1,
          },
        },
      ]) as Collection[];

      if (playLater.length === 0) {
        return res.status(200).json([]);
      }

      // map so we can quickly we can quickly check if a level is in playLater
      const map: { [key: string]: boolean } = (playLater[0].levels).reduce((acc, item) => {
        acc[item._id.toString()] = true;

        return acc;
      }, {} as { [key: string]: boolean });

      return res.status(200).json(map);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;

      await CollectionModel.updateOne(
        {
          userId: req.user._id,
          type: CollectionType.PlayLater,
          gameId: req.gameId
        },
        {
          $pull: {
            levels: id,
          },
        },
        {
          setDefaultsOnInsert: true,
          runValidators: true,
        },
      );

      return res.status(200).json({ success: true });
    }

    // TODO: should use save-level-to/[id].ts instead of this endpoint
    if (req.method === 'POST') {
      const { id } = req.body;

      const level = await LevelModel.findOne({
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
      }, { _id: 1 }).lean<Level>();

      if (!level) {
        return res.status(404).json({ error: 'Level not found.' });
      }

      const playLater = await CollectionModel.findOne({
        userId: req.user._id,
        type: CollectionType.PlayLater,
      }, {
        levels: 1,
      }).lean<Collection>();

      if (playLater) {
        if (playLater.levels.length >= MAX_LEVELS_IN_PLAY_LATER) {
          return res.status(400).json({ error: `You can only have ${MAX_LEVELS_IN_PLAY_LATER} levels in your Play Later. Please remove some levels and try again.` });
        }

        if (playLater.levels.find((level) => level.toString() === id)) {
          return res.status(400).json({ error: 'This level is already in your Play Later.' });
        }
      }

      await CollectionModel.findOneAndUpdate(
        {
          userId: req.user._id,
          type: CollectionType.PlayLater,
          gameId: playLater?.gameId || req.gameId,
        },
        {
          // add to set the id of the level to add to the PlayLater
          gameId: playLater?.gameId || req.gameId,
          name: !playLater?.name ? 'Play Later' : undefined,
          $addToSet: {
            levels: id,
          },
          slug: !playLater?.slug ? req.user.name + '/play-later' : undefined,
          type: !playLater?.type ? CollectionType.PlayLater : undefined,
          isPrivate: !playLater ? true : undefined, // Allow users to make their Play Later public if they want
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        },
      );

      return res.status(200).json({ success: true });
    }
  });
