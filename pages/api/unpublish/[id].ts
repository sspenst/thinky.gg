import { LevelModel, RecordModel, ReviewModel, StatModel, UserModel } from '../../../models/mongoose';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import type { NextApiResponse } from 'next';
import Stat from '../../../models/db/stat';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { id } = req.query;

  const level = await LevelModel.findById<Level>(id);

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  if (level.userId.toString() !== req.userId) {
    return res.status(401).json({
      error: 'Not authorized to delete this Level',
    });
  }

  const stats = await StatModel.find<Stat>({ levelId: id });
  const userIds = stats.filter(stat => stat.complete).map(stat => stat.userId);

  await Promise.all([
    LevelModel.updateOne({ _id: id }, { $set: {
      isDraft: true,
    }}),
    RecordModel.deleteOne({ levelId: id }),
    ReviewModel.deleteMany({ levelId: id }),
    StatModel.deleteMany({ levelId: id }),
    UserModel.updateMany({ _id: { $in: userIds } }, { $inc: { score: -1 }}),
    // TODO: possibly isUniverse == false? although I think I can get rid of this field
  ]);

  res.status(200).json({ success: true });
});
