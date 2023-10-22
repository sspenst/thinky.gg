import { ValidEnum, ValidObjectId } from '@root/helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps } from '@root/helpers/enrich';
import { generateCollectionSlug } from '@root/helpers/generateSlug';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { CollectionType } from '@root/models/CollectionEnums';
import Collection from '@root/models/db/collection';
import { CollectionModel, LevelModel, UserModel } from '@root/models/mongoose';
import { LEVEL_DEFAULT_PROJECTION } from '@root/models/schemas/levelSchema';
import { PipelineStage } from 'mongoose';
import { NextApiResponse } from 'next';

export const MAX_LEVELS_IN_PlayLater = 500;
export default withAuth(
  {
    POST: {
      body: {
        id: ValidObjectId(),
      },

    },
    GET: {
    },
    DELETE: {
      body: {
        id: ValidObjectId(),
      },
    },
  }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
    if (req.method === 'GET') {
      // grab the PlayLater
      const PlayLater = await CollectionModel.aggregate([
        {
          $match: {
            userId: req.user._id,
            type: CollectionType.PlayLater,
          }
        },
      ]) as Collection[];

      if (PlayLater.length === 0) {
        return res.status(200).json([]);
      }
      // return PlayLater[0] as a Map<string, boolean>
      // where the key is the level id and the value is true
      
      const map:{ [key: string]: boolean } = (PlayLater[0].levels).reduce((acc, item) => {
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

    if (req.method === 'POST') {
      const { id } = req.body;

      const level = await LevelModel.findOne({
        _id: id,
        isDraft: false,
        isDeleted: { $ne: true },
      }, {
        _id: 1,
      }, {
        lean: true,
      });

      if (!level) {
        return res.status(404).json({ error: 'Level not found.' });
      }

      // grab the PlayLater
      const PlayLater = await CollectionModel.findOne({
        userId: req.user._id,
        type: CollectionType.PlayLater,
      }, {
        levels: 1,
      }, {
        lean: true,
      }) as Collection;

      if (PlayLater) {
        if (PlayLater.levels.length > MAX_LEVELS_IN_PlayLater) {
          return res.status(400).json({ error: `You can only have ${MAX_LEVELS_IN_PlayLater} levels in your Play Later. Please remove some levels and try again.` });
        }

        if (PlayLater.levels.find((level) => level.toString() === id)) {
          return res.status(400).json({ error: 'This level is already in your Play Later.' });
        }
      }

      await CollectionModel.findOneAndUpdate(
        {
          userId: req.user._id,
          type: CollectionType.PlayLater,
        },
        {
          // add to set the id of the level to add to the PlayLater
          name: !PlayLater?.name ? 'Play Later' : undefined,
          $addToSet: {
            levels: id,
          },
          slug: !PlayLater?.slug ? req.user.name + '/play-later' : undefined,
          type: !PlayLater?.type ? CollectionType.PlayLater : undefined,
          private: !PlayLater?.private ? true : undefined,
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
