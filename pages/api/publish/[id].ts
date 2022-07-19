import { LevelModel, RecordModel, StatModel, UserModel } from '../../../models/mongoose';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Discord from '../../../constants/discord';
import Level from '../../../models/db/level';
import LevelDataType from '../../../constants/levelDataType';
import type { NextApiResponse } from 'next';
import { ObjectId } from 'bson';
import User from '../../../models/db/user';
import dbConnect from '../../../lib/dbConnect';
import discordWebhook from '../../../helpers/discordWebhook';
import getTs from '../../../helpers/getTs';
import revalidateLevel from '../../../helpers/revalidateLevel';
import revalidateUniverse from '../../../helpers/revalidateUniverse';

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

  if (level.leastMoves > 2500) {
    return res.status(400).json({
      error: 'Move count cannot be greater than 2500',
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
    LevelModel.updateOne({ _id: id }, {
      $set: {
        isDraft: false,
        ts: ts,
      },
    }),
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

  try {
    const [revalidateUniverseRes, revalidateLevelRes] = await Promise.all([
      revalidateUniverse(req),
      revalidateLevel(req, level.slug),
      discordWebhook(Discord.LevelsId, `**${user?.name}** published a new level: [${level.name}](${req.headers.origin}/level/${level.slug}?ts=${ts})`),
    ]);

    if (revalidateUniverseRes.status !== 200) {
      throw await revalidateUniverseRes.text();
    } else if (revalidateLevelRes.status !== 200) {
      throw await revalidateLevelRes.text();
    } else {
      return res.status(200).json({ updated: true });
    }
  } catch (err) {
    console.trace(err);

    return res.status(500).json({
      error: 'Error revalidating api/level/[id] ' + err,
    });
  }
});
