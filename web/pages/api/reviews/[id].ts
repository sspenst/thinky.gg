import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidObjectId } from '../../../helpers/apiWrapper';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import Review from '../../../models/db/review';
import { ReviewModel } from '../../../models/mongoose';

export default apiWrapper({ GET: {
  query: {
    id: ValidObjectId(),
  },
} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  await dbConnect();

  const reviews = await ReviewModel.find<Review>({ levelId: id })
    .populate('userId').sort({ ts: -1 });

  if (!reviews) {
    return res.status(404).json({
      error: 'Error finding Reviews',
    });
  }

  reviews.forEach(review => cleanUser(review.userId));

  return res.status(200).json(reviews);
});
