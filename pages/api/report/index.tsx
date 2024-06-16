import DiscordChannel from '@root/constants/discordChannel';
import { GameId } from '@root/constants/GameId';
import queueDiscordWebhook from '@root/helpers/discordWebhook';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import { logger } from '@root/helpers/logger';
import Comment from '@root/models/db/comment';
import Level from '@root/models/db/level';
import Review from '@root/models/db/review';
import { CommentModel, LevelModel, ReportModel, ReviewModel } from '@root/models/mongoose';
import type { NextApiResponse } from 'next';
import { ReportReason } from '../../../constants/ReportReason';
import { ReportStatus } from '../../../constants/ReportStatus';
import { ReportType } from '../../../constants/ReportType';
import { ValidEnum, ValidObjectId, ValidType } from '../../../helpers/apiWrapper';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';

export default withAuth({
  POST: {
    body: {
      targetId: ValidObjectId(true),
      reportReason: ValidEnum(Object.values(ReportReason), true),
      reportType: ValidEnum(Object.values(ReportType), true),
      message: ValidType('string', true),
    },
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  const { targetId, reportReason, reportType, message } = req.body;

  let url = '';
  const userReporting = req.user;

  let userBeingReported, reportEntityObj = null;

  switch (reportType) {
  case ReportType.LEVEL: {
    reportEntityObj = await LevelModel.findById(targetId) as Level;
    const game = getGameFromId(reportEntityObj.gameId);

    url = game.baseUrl + `/level/${reportEntityObj.slug}`;
    userBeingReported = reportEntityObj.userId;
    break;
  }

  case ReportType.COMMENT: {
    // report comment
    url = `/comments/${targetId}`;
    reportEntityObj = (await CommentModel.findById(targetId).populate('target')) as Comment;
    const game = getGameFromId(GameId.THINKY);

    url = game.baseUrl + `/profile/${reportEntityObj.target}`;
    userBeingReported = reportEntityObj.author;
    break;
  }

  case ReportType.REVIEW: {
    // report review
    reportEntityObj = (await ReviewModel.findById(targetId).populate('levelId userId')) as Review;

    const game = getGameFromId(reportEntityObj.gameId);

    url = game.baseUrl + `/level/${reportEntityObj.levelId.slug}`;
    userBeingReported = reportEntityObj.userId;
    break;
  }
  }

  if (!reportEntityObj) {
    return res.status(404).json({ error: 'Could not find entity to report. It may have been deleted.' });
  }

  if (!userBeingReported) {
    return res.status(404).json({ error: 'Could not find user to report. They may be been deleted.' });
  }

  try {
    await ReportModel.create({
      reporter: userReporting._id,
      reportedUser: userBeingReported,
      reportedEntity: targetId,
      reported: userBeingReported,
      reportedEntityModel: reportType,
      reasonType: reportReason,
      status: ReportStatus.OPEN,
      message: message,
    }, );
  } catch (err) {
    logger.error(err);

    return res.status(400).json({ error: 'You have already reported this. Please wait for it to be reviewed.' });
  }

  const content = `User ${userReporting.name} reported a ${reportType} by user ${userBeingReported.name} for reason ${reportReason} with message: ${message}. [Link](${url})`;

  await queueDiscordWebhook( DiscordChannel.DevPriv, content);

  return res.status(200).json({ success: true });
});
