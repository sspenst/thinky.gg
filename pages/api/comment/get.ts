import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidObjectId, ValidType } from '../../../helpers/apiWrapper';
import cleanUser from '../../../lib/cleanUser';
import { EnrichedComment } from '../../../models/db/comment';
import { CommentQuery, getLatestCommentsFromId } from './[id]';

export default apiWrapper({
  GET: {
    query: {
      id: ValidObjectId(),
      page: ValidType('string', false),
      targetModel: ValidType('string', false),
    },
  },
}, async (req: NextApiRequest, res: NextApiResponse) => {
  const { id, page, targetModel } = req.query;
  let pageNum = 0;

  if (page) {
    pageNum = Math.max(0, parseInt(page as string));
  }

  const gameId = getGameIdFromReq(req);
  const commentsAggregate = await getLatestCommentsFromId(gameId, id as string, false, pageNum, targetModel?.toString());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comments = commentsAggregate?.data as (EnrichedComment & { children: any })[];

  for (const comment of comments) {
    cleanUser(comment.author);

    if (comment.children) {
      comment.replies = comment.children[0]?.data;
      comment.totalReplies = comment.children[0]?.metadata?.totalRows || 0;

      for (const reply of comment.replies) {
        cleanUser(reply.author);
      }

      delete comment.children;
    }
  }

  return res.status(200).json({
    comments: comments as EnrichedComment[],
    totalRows: commentsAggregate?.metadata?.totalRows || 0,
  } as CommentQuery);
});
