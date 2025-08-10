import { ValidObjectId, ValidType } from '@root/helpers/apiWrapper';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import isFullAccount from '@root/helpers/isFullAccount';
import isPro from '@root/helpers/isPro';
import { logger } from '@root/helpers/logger';
import dbConnect from '@root/lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import Level from '@root/models/db/level';
import { LevelModel, QueueMessageModel } from '@root/models/mongoose';
import { QueueMessageState } from '@root/models/schemas/queueMessageSchema';
import mongoose, { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import { queuePublishLevel } from '../internal-jobs/worker/queueFunctions';
import { validateLevelForPublishing } from '../publish/[id]';

const ONE_MONTH_SECONDS = 30 * 24 * 60 * 60; // 1 month in seconds

export default withAuth({
  POST: {
    query: {
      id: ValidObjectId(),
    },
    body: {
      publishAt: ValidType('string', true),
    },
  },
  DELETE: {
    query: {
      id: ValidObjectId(),
    },
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'DELETE') {
    return handleCancelScheduledPublish(req, res);
  }

  if (!isFullAccount(req.user)) {
    return res.status(401).json({
      error: 'Scheduling a level publish requires a full account with a confirmed email'
    });
  }

  if (!isPro(req.user)) {
    return res.status(403).json({
      error: 'Scheduled publishing is a Pro feature'
    });
  }

  const { id } = req.query;
  const { publishAt } = req.body;

  await dbConnect();

  const publishDate = new Date(publishAt);
  const now = new Date();

  // Validate the publish date
  if (publishDate <= now) {
    return res.status(400).json({
      error: 'Publish date must be in the future'
    });
  }

  // Check if the publish date is more than 1 month in the future
  const maxDate = new Date(now.getTime() + ONE_MONTH_SECONDS * 1000);

  if (publishDate > maxDate) {
    return res.status(400).json({
      error: 'Cannot schedule more than 1 month in advance'
    });
  }

  const level = await LevelModel.findOne<Level>({
    _id: id,
    userId: req.userId,
  }).lean<Level>();

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  if (!level.isDraft) {
    return res.status(400).json({
      error: 'Level is already published',
    });
  }

  // Check if level is already scheduled
  if (level.scheduledQueueMessageId) {
    return res.status(400).json({
      error: 'Level is already scheduled for publishing',
    });
  }

  const gameId = getGameIdFromReq(req);

  // Validate the level for publishing (using shared validation)
  const validationError = await validateLevelForPublishing(level, new Types.ObjectId(req.userId), gameId, 'scheduling publish');

  if (validationError) {
    return res.status(400).json({
      error: validationError,
    });
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Queue the level for publishing
      const queueMessageId = await queuePublishLevel(level._id, publishDate, { session });

      // Update the level with the queue message ID
      await LevelModel.findByIdAndUpdate(id, {
        scheduledQueueMessageId: queueMessageId,
      }, { session });
    });

    return res.status(200).json({
      message: 'Level scheduled for publishing',
      publishAt: publishDate.toISOString(),
    });
  } catch (err) {
    logger.error(err);

    return res.status(500).json({
      error: 'Error scheduling level publish',
    });
  } finally {
    await session.endSession();
  }
});

async function handleCancelScheduledPublish(req: NextApiRequestWithAuth, res: NextApiResponse) {
  if (!isFullAccount(req.user)) {
    return res.status(401).json({
      error: 'Canceling scheduled publish requires a full account'
    });
  }

  const { id } = req.query;

  await dbConnect();

  const level = await LevelModel.findOne<Level>({
    _id: id,
    userId: req.userId,
  }).lean<Level>();

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  if (!level.scheduledQueueMessageId) {
    return res.status(400).json({
      error: 'Level is not scheduled for publishing',
    });
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Cancel the queue message
      await QueueMessageModel.findByIdAndUpdate(level.scheduledQueueMessageId, {
        state: QueueMessageState.FAILED,
        processingCompletedAt: new Date(),
        $push: {
          log: 'Canceled by user',
        },
      }, { session });

      // Remove the scheduled queue message ID from the level
      await LevelModel.findByIdAndUpdate(id, {
        $unset: { scheduledQueueMessageId: 1 },
      }, { session });
    });

    return res.status(200).json({
      message: 'Scheduled publishing canceled',
    });
  } catch (err) {
    logger.error(err);

    return res.status(500).json({
      error: 'Error canceling scheduled publish',
    });
  } finally {
    await session.endSession();
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
