import { requestBroadcastMatch, requestBroadcastMatches } from '@root/lib/appSocketToClient';
import { MatchAction, MultiplayerMatchState } from '@root/models/constants/multiplayer';
import { MultiplayerMatchModel } from '@root/models/mongoose';
import { generateMatchLog, SKIP_MATCH_LEVEL_ID } from '@root/models/schemas/multiplayerMatchSchema';
import { Types } from 'mongoose';

export async function matchMarkSkipLevel(
  userId: Types.ObjectId,
  matchId: string,
  levelId: Types.ObjectId
) {
  const skipId = new Types.ObjectId(SKIP_MATCH_LEVEL_ID);

  const updated = await MultiplayerMatchModel.findOneAndUpdate(
    {
      matchId: matchId,
      players: userId,
      // check if scoreTable.{req.userId} is set
      [`gameTable.${userId.toString()}`]: { $exists: true },
      [`gameTable.${userId.toString()}`]: { $ne: skipId },
      // check if game is active
      state: MultiplayerMatchState.ACTIVE,

      // check endTime is before now
      endTime: { $gte: new Date() },
    },
    {
      // add all zeros to mark skipped
      $addToSet: { [`gameTable.${userId.toString()}`]: skipId },
      $push: {
        matchLog: generateMatchLog(MatchAction.SKIP_LEVEL, {
          userId: userId,
          levelId: levelId,
        }),
      },
    },
    {
      new: true
    }
  );

  if (!updated) {
    return null;
  }

  await requestBroadcastMatch(updated.gameId, matchId);
  await requestBroadcastMatches(updated.gameId);

  return updated;
}
