import { ValidObjectId } from '@root/helpers/apiWrapper';
import { generateCollectionSlug } from '@root/helpers/generateSlug';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { CollectionType } from '@root/models/CollectionEnums';
import Collection from '@root/models/db/collection';
import { CollectionModel, LevelModel } from '@root/models/mongoose';
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
    },
    DELETE: {
      body: {
        id: ValidObjectId(),
      },
    },
  }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
    const { id } = req.body;

    if (req.method === 'GET') {
      // grab the playlist
      const playlist = await CollectionModel.findOne({
        userId: req.user._id,
        type: CollectionType.Playlist,
      }, {
        levels: 1,
      }, {
        lean: true,
      }) as Collection;

      return res.status(200).json(playlist);
    }

    if (req.method === 'DELETE') {
      await CollectionModel.updateOne(
        {
          userId: req.user._id,
          type: CollectionType.Playlist,
        },
        {
          // add to set the id of the level to add to the playlist
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
