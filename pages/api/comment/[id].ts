import { ObjectId } from 'bson';
import { NextApiResponse } from 'next';
import { ValidEnum, ValidObjectId, ValidType } from '../../../helpers/apiWrapper';
import cleanUser from '../../../lib/cleanUser';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { CommentModel } from '../../../models/mongoose';
import { USER_DEFAULT_PROJECTION } from '../../../models/schemas/userSchema';

export default withAuth({
  GET: {
    query: {
      id: ValidObjectId()
    }
  },
  POST: {
    body: {
      text: ValidType('string', true),
      targetModel: ValidEnum(['User', 'Comment'])
    },
    query: {
      id: ValidObjectId()
    }
  },
  DELETE: {
    query: {
      id: ValidObjectId()
    }
  }
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { id } = req.query;
    // GET means get all comments for a specific user

    const commentsAggregate = await CommentModel.aggregate([
      {
        $match: {
          target: new ObjectId(id as string),
          // where deleted is null
          deletedAt: null
        }
      },
      // conditionally look up model if target is not user
      {
        $lookup: {
          from: 'comments',
          localField: '_id',
          foreignField: 'target',
          as: 'children',
          pipeline: [
            {
              $sort: {
                createdAt: -1
              }
            },
            {
              $limit: 10 // max 10 sub comments
            }
          ]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author',
          pipeline: [
            {
              $project: {
                ...USER_DEFAULT_PROJECTION
              }
            }
          ]
        }
      },
      {
        $unwind: '$author'
      },
      {
        $sort: {
          createdAt: -1
        }
      },
      {
        $limit: 10
      }
    ]);

    for (const comment of commentsAggregate) {
      cleanUser(comment.author);
    }

    return res.status(200).json(commentsAggregate);
  } else if (req.method === 'POST') {
    const { id } = req.query;
    const { text, targetModel } = req.body;
    const textTrimmed = text.trim();

    if (textTrimmed.length === 0 || textTrimmed.length > 1000) {
      return res.status(400).json({ error: 'Comment must be between 1-500 characters' });
    }

    // POST means create new comment
    const comment = await CommentModel.create({
      author: req.user._id,
      text: textTrimmed,
      target: new ObjectId(id as string),
      targetModel: targetModel
    });

    return res.status(200).json(comment);
  } else if (req.method === 'DELETE') {
    const { id } = req.query;

    // DELETE means delete comment
    const comment = await CommentModel.findOneAndUpdate({
      _id: new ObjectId(id as string),
      author: req.user._id,
      deletedAt: null
    }, {
      deletedAt: new Date()
    }, {
      new: true
    });

    if (!comment) {
      return res.status(400).json({ error: 'There was a problem deleting this comment.' });
    }

    return res.status(200).json(comment);
  }
}
);
