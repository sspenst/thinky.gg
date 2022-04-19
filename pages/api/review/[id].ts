import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import type { NextApiResponse } from 'next';
import { ObjectId } from 'bson';
import { ReviewModel } from '../../../models/mongoose';
import dbConnect from '../../../lib/dbConnect';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { id } = req.query;
      const { score, text } = req.body;
  
      await dbConnect();
  
      const review = await ReviewModel.create({
        _id: new ObjectId(),
        levelId: id,
        score: score,
        text: text,
        ts: Math.floor(Date.now() / 1000),
        userId: req.userId,
      });

      res.status(200).json(review);
    } catch(err) {
      res.status(500).json({
        error: 'Error creating user',
      });
    }
  } else if (req.method === 'PUT') {
    const { id } = req.query;
    const { score, text } = req.body;

    const review = await ReviewModel.updateOne({
      levelId: id,
      userId: req.userId,
    }, {
      $set: {
        score: score,
        text: text,
        ts: Math.floor(Date.now() / 1000),
      },
    });

    res.status(200).json(review);
  } else if (req.method === 'DELETE') {
    const { id } = req.query;

    await dbConnect();

    await ReviewModel.deleteOne({
      levelId: id,
      userId: req.userId,
    });

    res.status(200).json({ success: true });
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
});
