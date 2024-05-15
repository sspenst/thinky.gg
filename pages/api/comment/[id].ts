import AchievementCategory from '@root/constants/achievements/achievementCategory';
import { GameId } from '@root/constants/GameId';
import { getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import isFullAccount from '@root/helpers/isFullAccount';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import { PipelineStage, Types } from 'mongoose';
import { NextApiResponse } from 'next';
import NotificationType from '../../../constants/notificationType';
import { ValidEnum, ValidObjectId, ValidType } from '../../../helpers/apiWrapper';
import { clearNotifications, createNewWallPostNotification } from '../../../helpers/notificationHelper';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { COMMENT_QUERY_LIMIT } from '../../../models/constants/comment';
import Comment, { EnrichedComment } from '../../../models/db/comment';
import User from '../../../models/db/user';
import { CommentModel, UserModel } from '../../../models/mongoose';
import { queueRefreshAchievements } from '../internal-jobs/worker';

export interface CommentQuery {
  comments: EnrichedComment[];
  totalRows: number;
}

export async function getLatestCommentsFromId(gameId: GameId, id: string, latest: boolean, page: number, targetModel?: string) {
  const tm = targetModel || 'User';

  const lookupStage = (tm === 'User' ? [{
    $lookup: {
      from: CommentModel.collection.name,
      localField: '_id',
      foreignField: 'target',
      as: 'children',
      pipeline: [
        {
          $match: {
            deletedAt: null,
            targetModel: 'Comment',
          }
        },
        {
          $sort: {
            createdAt: 1
          }
        },
        {
          $lookup: {
            from: UserModel.collection.name,
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
        ...getEnrichUserConfigPipelineStage(gameId, { excludeCalcs: true, localField: 'author._id', lookupAs: 'author.config' }),
        { '$facet': {
          metadata: [ { $count: 'totalRows' } ],
          data: [ { $limit: COMMENT_QUERY_LIMIT } ]
        } },
        {
          $unwind: {
            path: '$metadata',
            preserveNullAndEmptyArrays: true,
          }
        },
      ]
    }
  }] : []) as PipelineStage[];

  const commentsAggregate = await CommentModel.aggregate([
    {
      $match: {
        deletedAt: null,
        target: new Types.ObjectId(id),
        targetModel: tm,
      }
    },
    // conditionally look up model if target is not user
    ...lookupStage,
    {
      $lookup: {
        from: UserModel.collection.name,
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
    ...getEnrichUserConfigPipelineStage(gameId, { excludeCalcs: true, localField: 'author._id', lookupAs: 'author.config' }),
    {
      $sort: {
        // NB: when getting latest comments, we want to skip 0 and sort the other way, then reverse at the end
        createdAt: latest ? (tm === 'User' ? 1 : -1) : (tm === 'User' ? -1 : 1),
      }
    },
    { '$facet': {
      metadata: [ { $count: 'totalRows' } ],
      data: [ { $skip: page * COMMENT_QUERY_LIMIT }, { $limit: COMMENT_QUERY_LIMIT } ],
    } },
    {
      $unwind: {
        path: '$metadata',
        preserveNullAndEmptyArrays: true,
      }
    },
  ]);

  if (latest) {
    commentsAggregate[0].data.reverse();
  }

  return commentsAggregate[0];
}

export default withAuth({
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
  if (req.method === 'POST') {
    if (!isFullAccount(req.user)) {
      return res.status(401).json({
        error: 'Commenting requires a full account with a confirmed email'
      });
    }

    const { id } = req.query;
    const { text, targetModel } = req.body;
    const textTrimmed = text.trim();

    if (textTrimmed.length === 0 || textTrimmed.length > 1000) {
      return res.status(400).json({ error: 'Comment must be between 1-500 characters' });
    }

    const target = new Types.ObjectId(id as string);
    // POST means create new comment
    const comment = await CommentModel.create({
      author: req.user._id,
      text: textTrimmed,
      target: target,
      targetModel: targetModel
    });

    // TODO: check if this target has a parent, if so that is the model we want to notify

    if (targetModel === 'User') {
      // if you aren't commenting on your own profile, notify the target user
      if (target.toString() !== req.user._id.toString()) {
        await Promise.all([
          createNewWallPostNotification(req.gameId, NotificationType.NEW_WALL_POST, target, comment.author, target, JSON.stringify(comment)),
          queueRefreshAchievements(GameId.THINKY, req.user._id, [AchievementCategory.SOCIAL]),
        ]);
      }
    } else if (targetModel === 'Comment') {
      const [parentComment, everyoneInThread] = await Promise.all([
        CommentModel.findOne({
          _id: target,
          deletedAt: null,
        }).lean<Comment>(),
        CommentModel.aggregate([
          {
            $match: {
              target: target,
              deletedAt: null,
            }
          },
          {
            $group: {
              _id: '$author',
            }
          },
          {
            $project: {
              _id: 1,
            }
          }
        ])
      ]);

      // NEW_WALL_REPLY target is the parent's target (the user id of the profile it was posted on)
      if (parentComment) {
        // if you aren't replying to yourself, notify the parent comment author
        if (parentComment.author.toString() !== req.user._id.toString()) {
          await createNewWallPostNotification(req.gameId, NotificationType.NEW_WALL_REPLY, parentComment.author, req.user._id, parentComment.target, JSON.stringify(comment));
        }

        const othersInThread = everyoneInThread.filter(x => x._id.toString() !== parentComment.author.toString());

        // notify everyone else in the thread
        for (const user of othersInThread) {
          if (user._id.toString() !== req.user._id.toString()) {
            // TODO: Promise.all this loop
            await createNewWallPostNotification(req.gameId, NotificationType.NEW_WALL_REPLY, user._id, req.user._id, parentComment.target, JSON.stringify(comment));
          }
        }
      }
    }

    // on post, we should return the last page of comments
    const commentsAggregate = await getLatestCommentsFromId(req.gameId, id as string, true, 0, targetModel);

    return res.status(200).json(commentsAggregate);
  } else if (req.method === 'DELETE') {
    const { id } = req.query;

    const deletedComment = await softDeleteComment(new Types.ObjectId(id as string), req.user);

    if (!deletedComment) {
      return res.status(400).json({ error: 'There was a problem deleting this comment.' });
    }

    const commentsAggregate = await getLatestCommentsFromId(req.gameId, deletedComment.target._id.toString() as string, true, 0, deletedComment.targetModel as string);

    return res.status(200).json(commentsAggregate);
  }
});

async function softDeleteComment(commentId: Types.ObjectId, reqUser: User): Promise<Comment | null> {
  const comment = await CommentModel.findOneAndUpdate({
    _id: commentId,
    $or: [
      {
        author: reqUser._id,
      },
      {
        target: reqUser._id,
      }
    ],
    deletedAt: null
  }, {
    deletedAt: new Date()
  }, {
    new: true,
  });

  if (!comment) {
    return null;
  }

  const [findParent, findChildren] = await Promise.all(
    [
      CommentModel.findOne({
        _id: comment.target,
        deletedAt: null
      }).lean<Comment>(),
      CommentModel.find({
        target: comment._id,
        deletedAt: null
      }).lean<Comment[]>(),
    ]);

  const promises = [];

  for (const child of findChildren) {
    promises.push(softDeleteComment(child._id, child.author));
  }

  promises.push(clearNotifications(comment.target, comment.author, comment.target, NotificationType.NEW_WALL_POST)),
  promises.push(clearNotifications(findParent?.author._id, comment.author, findParent?.author._id, NotificationType.NEW_WALL_REPLY)),

  await Promise.all(promises);

  return comment as Comment;
}
