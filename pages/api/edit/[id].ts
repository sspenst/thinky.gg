import { isValidObjectId } from 'mongoose';
import type { NextApiResponse } from 'next';
import { ValidNumber, ValidObjectId, ValidType } from '../../../helpers/apiWrapper';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import { LevelModel } from '../../../models/mongoose';

export default withAuth({
  methods: ['PUT'],
  expected: {
    body: {
      data: ValidType('string'),
      height: ValidNumber(),
      width: ValidNumber(),
    },
    query: {
      id: ValidObjectId()
    }
  } }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  const { id } = req.query;
  const { data, height, width } = req.body;

  await dbConnect();

  const level = await LevelModel.findById<Level>(id, {}, { lean: true });

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  if (level.userId.toString() !== req.userId) {
    return res.status(401).json({
      error: 'Not authorized to edit this Level',
    });
  }

  if (!level.isDraft) {
    return res.status(400).json({
      error: 'Cannot edit a published level',
    });
  }

  await LevelModel.updateOne({ _id: id }, {
    $set: {
      data: data,
      height: height,
      leastMoves: 0,
      width: width,
    },
  }, { runValidators: true });

  return res.status(200).json(level);
});
