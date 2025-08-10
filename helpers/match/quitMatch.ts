import { requestBroadcastMatch, requestBroadcastMatches, requestClearBroadcastMatchSchedule } from '@root/lib/appSocketToClient';
import { MatchAction, MultiplayerMatchState } from '@root/models/constants/multiplayer';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import { MultiplayerMatchModel } from '@root/models/mongoose';
import { createMatchEventMessage, createSystemChatMessage, createUserActionMessage, enrichMultiplayerMatch, generateMatchLog } from '@root/models/schemas/multiplayerMatchSchema';
import { finishMatch } from '@root/pages/api/match';
import { Types } from 'mongoose';
import { logger } from '../logger';

export async function quitMatch(matchId: string, userId: Types.ObjectId) {
  const log = generateMatchLog(MatchAction.QUIT, {
    userId: userId,
  });

  // First find the match - include all states except ABORTED since player might still be in a finished match
  const match = await MultiplayerMatchModel.findOne({
    matchId: matchId,
    players: userId,
    state: { $in: [MultiplayerMatchState.OPEN, MultiplayerMatchState.ACTIVE, MultiplayerMatchState.FINISHED] },
  }).populate('players').lean<MultiplayerMatch>();

  if (!match) {
    logger.error('Could not find match ' + matchId);

    return null;
  }

  // Find the quitting user's name
  const quittingUser = (match.players as any[]).find(player => player._id.toString() === userId.toString());
  const quittingUserName = quittingUser ? quittingUser.name : 'A player';

  // Check if the quitting user is the host (createdBy)
  const isHost = match.createdBy.toString() === userId.toString();

  // Check if match is already finished
  if (match.state === MultiplayerMatchState.FINISHED) {
    logger.info(`User ${quittingUserName} trying to leave already finished match ${matchId}`);
    // Just remove them from the players array without changing match state
    const updatedMatch = await MultiplayerMatchModel.findOneAndUpdate(
      { matchId: matchId },
      {
        $pull: {
          players: userId,
        }
      },
      { new: true, populate: ['players', 'winners', 'levels'] }
    ).lean<MultiplayerMatch>();

    if (updatedMatch) {
      enrichMultiplayerMatch(updatedMatch, userId.toString());
      await Promise.all([
        requestBroadcastMatch(updatedMatch.gameId, matchId as string),
        requestBroadcastMatches(updatedMatch.gameId)
      ]);
    }

    return updatedMatch;
  }

  // Determine what action to take based on match state and user role
  const isMatchStarted = match.state === MultiplayerMatchState.ACTIVE && match.startTime && new Date(match.startTime) <= new Date();

  let updatedMatch;

  if (isMatchStarted) {
    // Any player leaving a started match = forfeit (including host)
    logger.info(`${isHost ? 'Host' : 'Non-host'} ${quittingUserName} forfeiting started match ${matchId}`);

    // Add forfeit message
    await MultiplayerMatchModel.updateOne(
      { matchId: matchId },
      {
        $push: {
          chatMessages: createUserActionMessage('forfeited the match.', userId.toString(), quittingUserName)
        }
      }
    );

    // Call finishMatch with the quitting player as the one who lost
    const finishedMatch = await finishMatch(match, userId.toString());

    // Broadcast the finished match state
    if (finishedMatch) {
      await Promise.all([
        requestBroadcastMatch(finishedMatch.gameId, matchId as string),
        requestBroadcastMatches(finishedMatch.gameId),
        requestClearBroadcastMatchSchedule(matchId)
      ]);
    }

    return finishedMatch;
  } else if (isHost) {
    // Host leaving unstarted match - abort
    logger.info(`Host ${quittingUserName} leaving unstarted match ${matchId}, aborting`);
    updatedMatch = await MultiplayerMatchModel.findOneAndUpdate(
      {
        matchId: matchId,
        players: userId,
      },
      {
        $pull: {
          players: userId,
          markedReady: userId,
        },
        $push: {
          matchLog: log,
          chatMessages: createUserActionMessage('(host) left. Match aborted.', userId.toString(), quittingUserName),
        },
        state: MultiplayerMatchState.ABORTED,
      },
      { new: true, populate: ['players', 'winners', 'levels'] }
    ).lean<MultiplayerMatch>();
  } else if (match.state === MultiplayerMatchState.ACTIVE) {
    // Non-host leaving an unstarted ACTIVE match - set back to OPEN
    logger.info(`Non-host ${quittingUserName} leaving unstarted match ${matchId}, setting to OPEN`);
    updatedMatch = await MultiplayerMatchModel.findOneAndUpdate(
      {
        matchId: matchId,
        players: userId,
        state: MultiplayerMatchState.ACTIVE,
      },
      {
        $pull: {
          players: userId,
          markedReady: userId,
        },
        $push: {
          matchLog: log,
          chatMessages: createUserActionMessage('left the match.', userId.toString(), quittingUserName),
        },
        state: MultiplayerMatchState.OPEN,
      },
      { new: true, populate: ['players', 'winners', 'levels'] }
    ).lean<MultiplayerMatch>();
  } else {
    // Non-host leaving an OPEN match - abort it
    logger.info(`Non-host ${quittingUserName} leaving OPEN match ${matchId}, aborting`);
    updatedMatch = await MultiplayerMatchModel.findOneAndUpdate(
      {
        matchId: matchId,
        players: userId,
        state: MultiplayerMatchState.OPEN,
      },
      {
        $pull: {
          players: userId,
        },
        $push: {
          matchLog: log,
          chatMessages: createUserActionMessage('left. Match aborted.', userId.toString(), quittingUserName),
        },
        state: MultiplayerMatchState.ABORTED,
      },
      { new: true, populate: ['players', 'winners', 'levels'] }
    ).lean<MultiplayerMatch>();
  }

  if (!updatedMatch) {
    logger.error(`Could not find match ${matchId} for user ${userId.toString()}`);

    return null;
  }

  enrichMultiplayerMatch(updatedMatch, userId.toString());
  await Promise.all([
    requestBroadcastMatch(updatedMatch.gameId, matchId as string),
    requestBroadcastMatches(updatedMatch.gameId),
    requestClearBroadcastMatchSchedule(updatedMatch.matchId)
  ]);

  return updatedMatch;
}
