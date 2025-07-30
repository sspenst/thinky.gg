import isPro from '@root/helpers/isPro';
import isFullAccount from '@root/helpers/isFullAccount';
import { TimerUtil } from '@root/helpers/getTs';
import { logger } from '@root/helpers/logger';
import { ValidObjectId, ValidType } from '@root/helpers/apiWrapper';
import dbConnect from '@root/lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import Level from '@root/models/db/level';
import { LevelModel, QueueMessageModel } from '@root/models/mongoose';
import { queuePublishLevel } from '../internal-jobs/worker/queueFunctions';
import { checkPublishRestrictions } from '../publish/[id]';
import { getGameFromId, getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { QueueMessageState } from '@root/models/schemas/queueMessageSchema';
import { Types } from 'mongoose';
import type { NextApiResponse } from 'next';

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
  const game = getGameFromId(gameId);

  // Validate level
  if (game.validateLevel) {
    const validateLevelResult = game.validateLevel(level.data);

    if (validateLevelResult.valid === false) {
      return res.status(400).json({
        error: validateLevelResult.reasons.join(', '),
      });
    }
  }

  if (level.leastMoves === 0) {
    return res.status(400).json({
      error: 'You must set a move count before scheduling publish',
    });
  }

  if (level.leastMoves > 2500) {
    return res.status(400).json({
      error: 'Move count cannot be greater than 2500',
    });
  }

  // Check for duplicate levels
  if (await LevelModel.findOne({
    data: level.data,
    isDeleted: { $ne: true },
    isDraft: false,
    gameId: level.gameId,
  })) {
    return res.status(400).json({
      error: 'An identical level already exists',
    });
  }

  if (await LevelModel.findOne({
    isDeleted: { $ne: true },
    isDraft: false,
    name: level.name,
    userId: req.userId,
    gameId: level.gameId,
  })) {
    return res.status(400).json({
      error: 'A level with this name already exists',
    });
  }

  // Check publish restrictions
  const restrictionError = await checkPublishRestrictions(level.gameId, req.user._id);
  if (restrictionError) {
    return res.status(400).json({
      error: restrictionError,
    });
  }

  try {
    // Queue the level for publishing
    const queueMessageId = await queuePublishLevel(level._id, publishDate);

    // Update the level with the queue message ID
    await LevelModel.findByIdAndUpdate(id, {
      scheduledQueueMessageId: queueMessageId,
    });

    return res.status(200).json({
      message: 'Level scheduled for publishing',
      publishAt: publishDate.toISOString(),
      queueMessageId: queueMessageId.toString(),
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({
      error: 'Error scheduling level publish',
    });
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

  try {
    // Cancel the queue message
    await QueueMessageModel.findByIdAndUpdate(level.scheduledQueueMessageId, {
      state: QueueMessageState.FAILED,
      processingCompletedAt: new Date(),
      $push: {
        log: 'Canceled by user',
      },
    });

    // Remove the scheduled queue message ID from the level
    await LevelModel.findByIdAndUpdate(id, {
      $unset: { scheduledQueueMessageId: 1 },
    });

    return res.status(200).json({
      message: 'Scheduled publishing canceled',
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({
      error: 'Error canceling scheduled publish',
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}