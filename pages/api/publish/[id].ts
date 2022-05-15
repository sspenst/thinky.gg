import { LevelModel, RecordModel, StatModel, UserModel } from '../../../models/mongoose';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import LevelDataType from '../../../constants/levelDataType';
import type { NextApiResponse } from 'next';
import { ObjectId } from 'bson';
import dbConnect from '../../../lib/dbConnect';
import getTs from '../../../helpers/getTs';

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

  if (await LevelModel.findOne({ data: level.data, isDraft: { $ne: true } })) {
    return res.status(400).json({
      error: 'An identical level already exists',
    });
  }

  const ts = getTs();

  await Promise.all([
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
    UserModel.updateOne({ _id: req.userId }, {
      $inc: { score: 1 },
    }),
  ]);

  await fetch(`${req.headers.origin}/api/revalidate/publish?secret=${process.env.REVALIDATE_SECRET}`, {
    method: 'POST',
    body: JSON.stringify({
      levelId: level._id,
      universeId: level.officialUserId ?? level.userId,
      worldId: level.worldId,
    }),
    headers: {
      'Content-Type': 'application/json'
    },
  }).then(res2 => {
    if (res2.status === 200) {
      return res.status(200).json(level);
    } else {
      throw res2.text();
    }
  }).catch(err => {
    console.error(err);
    return res.status(500).json({
      error: 'Error revalidating after publish',
    });
  });
});
