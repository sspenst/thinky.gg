import type { NextApiResponse } from 'next';
import { ValidObjectId } from '../../../../../helpers/apiWrapper';
import isCurator from '../../../../../helpers/isCurator';
import * as transformLevel from '../../../../../helpers/transformLevel';
import withAuth, { NextApiRequestWithAuth } from '../../../../../lib/withAuth';
import Level from '../../../../../models/db/level';
import { LevelModel } from '../../../../../models/mongoose';

export default withAuth({
  PUT: {
    query: {
      id: ValidObjectId(true),
    },
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'PUT') {
    const { id } = req.query;

    const level = await LevelModel.findById<Level>(id);

    if (!level) {
      return res.status(400).json({
        error: 'Level not found',
      });
    }

    if (isCurator(req.user) || req.userId === level.userId.toString()) {
      // trim the level
      let data = level.data;

      data = transformLevel.trimLevel(data);
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
          error: 'Level after trimming is identical to another',
        });
      }

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
      });

      // update level properties for return object
      level.data = data;
      level.width = newWidth;
      level.height = newHeight;
    }

    return res.status(200).json(level);
  }
});
