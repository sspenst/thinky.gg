import { ValidObjectId } from '@root/helpers/apiWrapper';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { CollectionType } from '@root/models/CollectionEnums';
import Collection from '@root/models/db/collection';
import { CollectionModel } from '@root/models/mongoose';
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
      body: {
        id: ValidObjectId(),
      },
    },
    DELETE: {
      query: {
        id: ValidObjectId(),
      },
    },
  }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
    const { id } = req.body;

    if (req.method === 'POST') {
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

      const list = await CollectionModel.findOneAndUpdate(
        {
          userId: req.user._id,
          type: CollectionType.Playlist,
        },
        {
          // add to set the id of the level to add to the playlist
          $addToSet: {
            levels: id,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      );

      return res.status(200).json(list);
    }
  });
