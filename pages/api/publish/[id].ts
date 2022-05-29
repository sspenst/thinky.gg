import { ObjectId } from 'bson';
import type { NextApiResponse } from 'next';
import LevelDataType from '../../../constants/levelDataType';
import discordWebhook from '../../../helpers/discordWebhook';
import getTs from '../../../helpers/getTs';
import revalidateUniverse from '../../../helpers/revalidateUniverse';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import User from '../../../models/db/user';
import { LevelModel, RecordModel, StatModel, UserModel } from '../../../models/mongoose';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { id } = req.query;

  await dbConnect();

  const level = await LevelModel.findOne<Level>({
    _id: id,
    userId: req.userId,
  });

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  if ((level.data.match(new RegExp(LevelDataType.Start, 'g')) || []).length !== 1) {
    return res.status(400).json({
      error: 'There must be exactly one start block',
    });
  }

  if ((level.data.match(new RegExp(LevelDataType.Start, 'g')) || []).length === 0) {
    return res.status(400).json({
      error: 'There must be at least one end block',
    });
  }

  if (level.leastMoves === 0) {
    return res.status(400).json({
      error: 'You must set a move count before publishing',
    });
  }

  if (await LevelModel.findOne({ data: level.data, isDraft: false })) {
    return res.status(400).json({
      error: 'An identical level already exists',
    });
  }

  const ts = getTs();

  const [user] = await Promise.all([
    UserModel.findOneAndUpdate<User>({ _id: req.userId }, {
      $inc: { score: 1 },
    }),
    LevelModel.updateOne({ _id: id }, { $set: {
      isDraft: false,
      ts: ts,
    }}),
    RecordModel.create({
      _id: new ObjectId(),
      levelId: level._id,
      moves: level.leastMoves,
      ts: ts,
      userId: new ObjectId(req.userId),
    }),
    StatModel.create({
      _id: new ObjectId(),
      attempts: 1,
      complete: true,
      levelId: level._id,
      moves: level.leastMoves,
      ts: ts,
      userId: new ObjectId(req.userId),
    }),
  ]);

  const [revalidateRes] = await Promise.all([
    revalidateUniverse(req, res),
    discordWebhook(`**${user?.name}** published a new level: [${level.name}](${req.headers.origin}/level/${level.slug})`),
  ]);

  return revalidateRes;
});
