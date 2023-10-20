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

export const MAX_LEVELS_IN_PLAYLIST = 500;
export default withAuth(
  {
    POST: {
      body: {
        id: ValidObjectId(),
      },

    },
    GET: {
      query: {
        populate: ValidEnum(['true', 'false'], false),
      }
    },
    DELETE: {
      body: {
        id: ValidObjectId(),
      },
    },
  }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
    if (req.method === 'GET') {
      const { populate } = req.query;
      const populateStage = populate === 'true' ? [{
        $lookup: {
          from: LevelModel.collection.name,
          localField: 'levels',
          foreignField: '_id',
          as: 'levels',
          pipeline: [
            {
              $project: LEVEL_DEFAULT_PROJECTION
            },
            {
              $lookup: {
                from: UserModel.collection.name,
                localField: 'userId',
                foreignField: '_id',
                as: 'userId',
                pipeline: [{
                  $project: {
                    name: 1
                  }
                }]
              }
            },
            ...getEnrichLevelsPipelineSteps(req.user, '_id', '') as PipelineStage.Lookup[],
          ],
        }
      }] : [];
      // grab the playlist
      const playlist = await CollectionModel.aggregate([
        {
          $match: {
            userId: req.user._id,
            type: CollectionType.Playlist,
          }
        },
        ...(populateStage as PipelineStage[]),
      ]) as Collection[];

      if (playlist.length === 0) {
        return res.status(200).json([]);
      }

      return res.status(200).json(playlist[0]);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;

      await CollectionModel.updateOne(
        {
          userId: req.user._id,
          type: CollectionType.Playlist,
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

      // grab the playlist
      const playlist = await CollectionModel.findOne({
        userId: req.user._id,
        type: CollectionType.Playlist,
      }, {
        levels: 1,
      }, {
        lean: true,
      }) as Collection;

      if (playlist) {
        if (playlist.levels.length > MAX_LEVELS_IN_PLAYLIST) {
          return res.status(400).json({ error: `You can only have ${MAX_LEVELS_IN_PLAYLIST} levels in your playlist. Please remove some levels and try again.` });
        }

        if (playlist.levels.find((level) => level.toString() === id)) {
          return res.status(400).json({ error: 'This level is already in your playlist.' });
        }
      }

      await CollectionModel.findOneAndUpdate(
        {
          userId: req.user._id,
          type: CollectionType.Playlist,
        },
        {
          // add to set the id of the level to add to the playlist
          name: !playlist?.name ? 'Playlist' : undefined,
          $addToSet: {
            levels: id,
          },
          slug: !playlist?.slug ? req.user.name + '/playlist' : undefined,
          type: !playlist?.type ? CollectionType.Playlist : undefined,
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
