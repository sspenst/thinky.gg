import { requestBroadcastMatch, requestBroadcastMatches, requestClearBroadcastMatchSchedule } from '@root/lib/appSocketToClient';
import { MatchAction, MultiplayerMatchState } from '@root/models/constants/multiplayer';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import { MultiplayerMatchModel } from '@root/models/mongoose';
import { enrichMultiplayerMatch, generateMatchLog } from '@root/models/schemas/multiplayerMatchSchema';
import { finishMatch } from '@root/pages/api/match';
import { Types } from 'mongoose';
import { logger } from '../logger';

export async function quitMatch(matchId: string, userId: Types.ObjectId) {
  const log = generateMatchLog(MatchAction.QUIT, {
    userId: userId,
  });

  let updatedMatch = await MultiplayerMatchModel.findOneAndUpdate(
    {
      matchId: matchId,
      players: userId,
      // don't need gameId I believe in query because we query directly for matchId
      $or: [
        {
          startTime: { $gte: Date.now() },
          state: MultiplayerMatchState.ACTIVE,
        },
        {
          state: MultiplayerMatchState.OPEN,
        },
      ]
    },
    {
      $pull: {
        players: userId,
      },
      $push: {
        matchLog: log,
      },
      state: MultiplayerMatchState.ABORTED,
    },
    { new: true, populate: ['players', 'winners', 'levels'] }
  ).lean<MultiplayerMatch>();

  if (!updatedMatch) {
    updatedMatch = await MultiplayerMatchModel.findOne({ matchId: matchId, players: userId, state: MultiplayerMatchState.ACTIVE }).lean<MultiplayerMatch>();

    if (!updatedMatch) {
      logger.error('Could not find match ' + matchId);

      return null;
    }

    await finishMatch(updatedMatch, userId.toString());
  }

  enrichMultiplayerMatch(updatedMatch, userId.toString());
  await requestBroadcastMatch(updatedMatch.gameId, matchId as string);
  await requestBroadcastMatches(updatedMatch.gameId);
  await requestClearBroadcastMatchSchedule(
    updatedMatch.matchId
  );
  await requestClearBroadcastMatchSchedule(
    updatedMatch.matchId
  );

  return updatedMatch;
}
