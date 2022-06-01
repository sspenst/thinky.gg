import withAuth, { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import Level from '../../../../models/db/level';
import { LevelModel } from '../../../../models/mongoose';
import type { NextApiResponse } from 'next';
import dbConnect from '../../../../lib/dbConnect';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  await dbConnect();

  const {params} = req.query;
  const level = await getLevelByUrlPath(params as string[]);
  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }
  return res.status(200).json(level);
});

export async function getLevelByUrlPath(params: string[]):Promise<Level | null> {
  let level;
  if (params.length === 1) {
    const id = params[0];
    level = await LevelModel.findById<Level>(id)
      .populate('userId', 'name');
  } else {
    const [id, slugName] = params;
    try {
      level = await LevelModel.findOne({
        slug: id + '/' + slugName,
        isDraft: false
      }).populate('userId', 'name');
    } catch (err) {
      console.trace(err);
      return null;
    }
  }
  return level;
}
