import { logger } from '@root/helpers/logger';
import mongoose, { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import { ValidObjectId } from '../../../../../helpers/apiWrapper';
import { enrichLevels } from '../../../../../helpers/enrich';
import { generateLevelSlug } from '../../../../../helpers/generateSlug';
import isCurator from '../../../../../helpers/isCurator';
import cleanUser from '../../../../../lib/cleanUser';
import withAuth, { NextApiRequestWithAuth } from '../../../../../lib/withAuth';
import Level from '../../../../../models/db/level';
import * as transformLevel from '../../../../../helpers/transformLevel';
import { CollectionModel, LevelModel, UserModel } from '../../../../../models/mongoose';

export default withAuth({
  PUT: {
    query: {
      id: ValidObjectId(true),
    },
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'PUT') {
    if (!req.body) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    const { id } = req.query;
    const { trim, simplify } = req.body;

    const level = await LevelModel.findById<Level>(id);

    if (!level) {
      return res.status(400).json({
        error: 'Level not found',
      });
    }

    if (isCurator(req.user) || req.userId === level.userId.toString()) {
      // simplify, then trim the level
      let data = level.data;
      if (simplify) {
        data = transformLevel.simplifyLevelUnreachable(data);
      }
      if (trim) {
        data = transformLevel.trimLevel(data);
      }
      const newWidth = transformLevel.getWidth(data);
      const newHeight = transformLevel.getHeight(data);
      // check for a duplicate
      if (await LevelModel.findOne({
        data: data,
        isDeleted: { $ne: true },
        isDraft: false,
        gameId: level.gameId,
      })) {
        return res.status(400).json({
          error: `Level after modification is identical to another`,
        });
      }

      // attempt to update the database
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          await LevelModel.updateOne({
            _id: id,
          }, {
            $set: {
              data: data,
              width: newWidth,
              height: newHeight,
            },
          }, {
            runValidators: true,
            session: session,
          });

          // update level properties for return object
          level.data = data;
          level.width = newWidth;
          level.height = newHeight;
        });

        session.endSession();
      } catch (err) {
        logger.error(err);
        session.endSession();

        return res.status(500).json({
          error: `Error updating slug for level id ${level._id.toString()}`,
        });
      }
    }

    return res.status(200).json(level);
  }
});
