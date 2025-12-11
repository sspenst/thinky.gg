import DiscordChannel from '@root/constants/discordChannel';
import { GameId } from '@root/constants/GameId';
import queueDiscordWebhook from '@root/helpers/discordWebhook';
import { getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import { generateLevels } from '@root/helpers/match/generateLevels';
import { getMatch } from '@root/helpers/match/getMatch';
import { matchMarkSkipLevel } from '@root/helpers/match/matchMarkSkipLevel';
import { quitMatch } from '@root/helpers/match/quitMatch';
import { multiplayerMatchTypeToText } from '@root/helpers/multiplayerHelperFunctions';
import cleanUser from '@root/lib/cleanUser';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import User from '@root/models/db/user';
import { PipelineStage } from 'mongoose';
import { NextApiResponse } from 'next';
import { DIFFICULTY_INDEX } from '../../../components/formatted/formattedDifficulty';
import NotificationType from '../../../constants/notificationType';
import { ValidEnum, ValidType } from '../../../helpers/apiWrapper';
import { checkIfBlocked } from '../../../helpers/getBlockedUserIds';
import { createMultiplayerInviteNotification } from '../../../helpers/notificationHelper';
import { requestBroadcastMatch, requestBroadcastMatches, requestBroadcastPrivateAndInvitedMatches, requestScheduleBroadcastMatch } from '../../../lib/appSocketToClient';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { MatchAction, MultiplayerMatchState, MultiplayerMatchType, MultiplayerMatchTypeDurationMap } from '../../../models/constants/multiplayer';
import Level from '../../../models/db/level';
import MultiplayerMatch from '../../../models/db/multiplayerMatch';
import { LevelModel, MultiplayerMatchModel, NotificationModel, UserModel } from '../../../models/mongoose';
import { createMatchEventMessage, createUserActionMessage, enrichMultiplayerMatch, generateMatchLog } from '../../../models/schemas/multiplayerMatchSchema';
import { isChatRateLimited } from '../../../server/socket/chatRateLimiter';

export default withAuth(
  {
    GET: {},
    PUT: {
      body: {
        action: ValidEnum([
          MatchAction.JOIN,
          MatchAction.MARK_READY,
          MatchAction.UNMARK_READY,
          MatchAction.QUIT,
          MatchAction.SKIP_LEVEL,
          MatchAction.SEND_CHAT_MESSAGE,
          MatchAction.INVITE_USER,
        ]),
        invitedUserId: ValidType('string', false),
        levelId: ValidType('string', false),
        message: ValidType('string', false),
      },
    },
  },
  async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
    const { matchId } = req.query;

    if (req.method === 'GET') {
      const match = await getMatch(req.gameId, matchId as string, req.user);

      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      return res.status(200).json(match);
    } else if (req.method === 'PUT') {
      const { action, message } = req.body;

      if (action === MatchAction.MARK_READY) {
        const match = await MultiplayerMatchModel.findOne({
          matchId: matchId,
          players: req.user._id,
          state: MultiplayerMatchState.ACTIVE,
          startTime: {
            $gte: new Date(), // has not started yet but about to start
          }
        });

        if (!match) {
          return res.status(400).json({
            error: 'Cannot mark yourself ready in this match',
          });
        }

        let updatedMatch = await MultiplayerMatchModel.findOneAndUpdate(
          {
            matchId: matchId,
            players: req.user._id,
            state: MultiplayerMatchState.ACTIVE,
            startTime: {
              $gte: new Date(),
            }
          },
          {
            $addToSet: { markedReady: req.user._id },
            $push: {
              chatMessages: createUserActionMessage('is ready!', req.user._id.toString(), req.user.name)
            },
          },
          { new: true }
        ).populate('players winners levels createdBy').lean<MultiplayerMatch>();

        // Check if all players are ready

        if (updatedMatch && updatedMatch.markedReady.length === updatedMatch.players.length) {
          // All players ready, start the match in 3 seconds
          const newStartTime = new Date(Date.now() + 3000);
          const newEndTime = new Date(
            newStartTime.getTime() + MultiplayerMatchTypeDurationMap[updatedMatch.type as MultiplayerMatchType]
          );

          // If levels are not yet generated, generate them now that both players are ready
            const level0s = generateLevels(
              updatedMatch.gameId,
              DIFFICULTY_INDEX.KINDERGARTEN,
              DIFFICULTY_INDEX.ELEMENTARY,
              {
                minSteps: 6,
                maxSteps: 25,
                minLaplace: 0.5,
              },
              10
            );
            const level1s = generateLevels(
              updatedMatch.gameId,
              DIFFICULTY_INDEX.JUNIOR_HIGH,
              DIFFICULTY_INDEX.HIGH_SCHOOL,
              {},
              20
            );
            const level2s = generateLevels(
              updatedMatch.gameId,
              DIFFICULTY_INDEX.BACHELORS,
              DIFFICULTY_INDEX.PROFESSOR,
              {},
              5
            );
            const level3s = generateLevels(
              updatedMatch.gameId,
              DIFFICULTY_INDEX.PHD,
              DIFFICULTY_INDEX.SUPER_GRANDMASTER,
              {},
              5
            );

            const [l0, l1, l2, l3] = await Promise.all([level0s, level1s, level2s, level3s]);

            // Dedupe these level ids
            const dedupedLevels = new Set([...l0, ...l1, ...l2, ...l3]);

            if (dedupedLevels.size < 40) {
              // Fallback to any levels to ensure we have enough
              const level4s = await LevelModel.find<Level[]>(
                {
                  isDraft: { $ne: true },
                  isDeleted: { $ne: true },
                  gameId: updatedMatch.gameId,
                },
                { _id: 1 },
                { limit: 40 - dedupedLevels.size }
              ).lean<Level[]>();

              level4s.forEach((level) => dedupedLevels.add(level));
            }

            // Update match with levels and initialize gameTable
            const matchUrl = `${req.headers.origin}/match/${matchId}`;
            const game = getGameFromId(updatedMatch.gameId);
            const discordChannel = game.id === GameId.SOKOPATH ? DiscordChannel.SokopathMultiplayer : DiscordChannel.PathologyMultiplayer;
            const discordMessage = `*${multiplayerMatchTypeToText(updatedMatch.type)}* match starting between ${updatedMatch.players
              ?.map((p) => `**${(p as User).name}**`)
              .join(' and ')}! [Spectate here](<${matchUrl}>)`;

              console.log('generating with levels ', dedupedLevels, matchId);
            const [updatedMatch2, ] = await Promise.all([
              MultiplayerMatchModel.findOneAndUpdate(
                { matchId: matchId },
                {
                  startTime: newStartTime,
                  endTime: newEndTime,
                  $push: {
                    chatMessages: createMatchEventMessage('Match starting in 3 seconds!'),
                  },
                  levels: [...dedupedLevels].map((level: Level) => level._id),
                  gameTable: {
                    [updatedMatch.players[0]._id.toString()]: [],
                    [updatedMatch.players[1]._id.toString()]: [],
                  },
                }, {
                  new: true
                }
              ),
              // Only announce if not private
              updatedMatch.private && Promise.resolve(),
              !updatedMatch.private && queueDiscordWebhook(
                discordChannel,
                discordMessage,
                undefined,
                updatedMatch.players.map((player: User) => player.name),
              ),
            ]);

          // Update the match object with new times for broadcasting
          updatedMatch = updatedMatch2;
          await requestScheduleBroadcastMatch(updatedMatch2.gameId, matchId as string);
        }

        // Clean and enrich the match before broadcasting
        if (updatedMatch) {
          updatedMatch.players.forEach(player => cleanUser(player as User));
          updatedMatch.winners.forEach(winner => cleanUser(winner as User));
          cleanUser(updatedMatch.createdBy as User);
          enrichMultiplayerMatch(updatedMatch, req.userId);
          await requestBroadcastMatch(updatedMatch.gameId, matchId as string);
        }

        return res.status(200).json({ success: true });
      } else if (action === MatchAction.UNMARK_READY) {
        const updatedMatch = await MultiplayerMatchModel.findOneAndUpdate(
          {
            matchId: matchId,
            players: req.user._id,
            state: MultiplayerMatchState.ACTIVE,
            startTime: {
              $gte: new Date(), // has not started yet
            }
          },
          {
            $pull: { markedReady: req.user._id },
            $push: {
              chatMessages: createUserActionMessage('is no longer ready.', req.user._id.toString(), req.user.name)
            },
          },
          { new: true }
        ).populate('players winners levels createdBy').lean<MultiplayerMatch>();

        if (!updatedMatch) {
          return res.status(400).json({
            error: 'Cannot unmark yourself ready in this match',
          });
        }

        // Clean and enrich the match before broadcasting
        if (updatedMatch) {
          updatedMatch.players.forEach(player => cleanUser(player as User));
          updatedMatch.winners.forEach(winner => cleanUser(winner as User));
          cleanUser(updatedMatch.createdBy as User);
          enrichMultiplayerMatch(updatedMatch, req.userId);
        }

        await requestBroadcastMatch(updatedMatch.gameId, matchId as string);

        return res.status(200).json({ success: true });
      } else if (action === MatchAction.JOIN) {
        // joining this match... Should also start the match!
        const involvedMatch = await MultiplayerMatchModel.findOne(
          {
            players: req.user._id,
            state: {
              $in: [MultiplayerMatchState.ACTIVE, MultiplayerMatchState.OPEN],
            },
            gameId: req.gameId,
          },
        ).lean<MultiplayerMatch>();

        if (involvedMatch && involvedMatch.matchId !== matchId) {
          // if reqUser is involved in their own match (still OPEN), then we
          // can safely quit that match and allow them to join the new match
          if (involvedMatch.state === MultiplayerMatchState.OPEN) {
            await quitMatch(involvedMatch.matchId as string, req.user._id);
          } else {
            return res.status(400).json({
              error:
                'You are already involved in a match that has started. Quit one to join this one.',
            });
          }
        }

        const log = generateMatchLog(MatchAction.JOIN, {
          userId: req.user._id,
        });
        const match = await MultiplayerMatchModel.findOne<MultiplayerMatch>({
          matchId: matchId,
        }) as MultiplayerMatch;

        const updatedMatch = await MultiplayerMatchModel.findOneAndUpdate(
          {
            matchId: matchId,
            state: MultiplayerMatchState.OPEN,
            players: {
              $nin: [req.user._id],
              // size should be 1
              $size: 1,
            },
          },
          {
            $push: {
              players: req.user._id,
              matchLog: log,
              chatMessages: createUserActionMessage('joined the match!', req.user._id.toString(), req.user.name),
            },
            // Set a far future start time as placeholder until all players ready
            startTime: Date.now() + 600000, // 10 minutes in the future as placeholder
            endTime: Date.now() + 600000 + MultiplayerMatchTypeDurationMap[match.type as MultiplayerMatchType],
            state: MultiplayerMatchState.ACTIVE,
          },
          { new: true }
        ).lean<MultiplayerMatch>();

        //populate: ['players', 'winners', 'levels']

        if (!updatedMatch) {
          res
            .status(400)
            .json({ error: 'Match not found or you are already in the match' });

          return;
        }

        const matchPopulated = await MultiplayerMatchModel.aggregate<MultiplayerMatch>([
          {
            $match: {
              matchId: matchId,
            },
          },
          {
            $lookup: {
              from: UserModel.collection.name,
              localField: 'players',
              foreignField: '_id',
              as: 'players',
              pipeline: [
                {
                  $project: USER_DEFAULT_PROJECTION
                },
                ...getEnrichUserConfigPipelineStage(updatedMatch.gameId) as PipelineStage.Lookup[],
              ]
            },
          },
          {
            $lookup: {
              from: UserModel.collection.name,
              localField: 'winners',
              foreignField: '_id',
              as: 'winners',
              pipeline: [
                {
                  $project: USER_DEFAULT_PROJECTION
                },
                ...getEnrichUserConfigPipelineStage(updatedMatch.gameId) as PipelineStage.Lookup[],
              ]
            },
          },
          {
            $lookup: {
              from: LevelModel.collection.name,
              localField: 'levels',
              foreignField: '_id',
              as: 'levels',
            },
          },
        ]);

        if (matchPopulated.length === 0) {
          return res.status(500).json({ error: 'Error populating match' });
        }

        const populatedMatch = matchPopulated[0];

        // Defer level generation until both players are marked ready

        // cleanUser for players, winners
        populatedMatch.players.map(player => cleanUser(player as User));
        populatedMatch.winners.map(winner => cleanUser(winner as User));
        enrichMultiplayerMatch(populatedMatch, req.userId);

        await Promise.all([
          requestBroadcastMatches(populatedMatch.gameId),
          requestBroadcastPrivateAndInvitedMatches(populatedMatch.gameId, req.user._id),
          requestBroadcastMatch(populatedMatch.gameId, populatedMatch.matchId),
          requestScheduleBroadcastMatch(populatedMatch.gameId, populatedMatch.matchId),
        ]);

        return res.status(200).json(populatedMatch);
      } else if (action === MatchAction.QUIT) {
        const updatedMatch = await quitMatch(matchId as string, req.user._id);

        if (!updatedMatch) {
          return res.status(400).json({ error: 'Match not found' });
        }

        await requestBroadcastPrivateAndInvitedMatches(updatedMatch.gameId, req.user._id);

        return res.status(200).json(updatedMatch);
      } else if (action === MatchAction.SKIP_LEVEL) {
        // skipping level (always skips the current level)
        const result = await matchMarkSkipLevel(
          req.user._id,
          matchId as string
        );

        if (!result) {
          return res.status(400).json({ error: 'Already used skip' });
        }

        // The match is already broadcast by matchMarkSkipLevel
        // Just need to ensure we return success
        return res.status(200).json({ success: true });
      } else if (action === MatchAction.SEND_CHAT_MESSAGE) {
        // Validate message
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
          return res.status(400).json({ error: 'Message is required' });
        }

        if (message.length > 150) {
          return res.status(400).json({ error: 'Message too long (max 150 characters)' });
        }

        // Check chat rate limiting
        if (isChatRateLimited(req.user._id.toString())) {
          return res.status(429).json({ error: 'You are sending messages too quickly. Please wait before sending another message.' });
        }

        // Note: Room count check is handled on the frontend since the socket server runs separately
        // and we can't reliably access its state from the API routes

        // Add chat message to match (allow spectators too)
        const updatedMatch = await MultiplayerMatchModel.findOneAndUpdate(
          {
            matchId: matchId,
          },
          {
            $push: {
              chatMessages: {
                userId: req.user._id,
                message: message.trim(),
                createdAt: new Date(),
              },
            },
          },
          { new: true }
        ).lean<MultiplayerMatch>();

        if (!updatedMatch) {
          return res.status(400).json({ error: 'Cannot send message to this match' });
        }

        // Broadcast the match update so players see the new message
        await requestBroadcastMatch(updatedMatch.gameId, matchId as string);

        return res.status(200).json({ success: true, messageCount: updatedMatch.chatMessages?.length });
      } else if (action === MatchAction.INVITE_USER) {
        const { invitedUserId } = req.body;

        console.log('INVITE_USER action triggered');
        console.log('invitedUserId:', invitedUserId);
        console.log('matchId:', matchId);

        if (!invitedUserId) {
          return res.status(400).json({ error: 'invitedUserId is required' });
        }

        // Check if match exists and is joinable (OPEN state, has space)
        const match = await MultiplayerMatchModel.findOne({
          matchId: matchId,
          state: MultiplayerMatchState.OPEN,
          players: { $size: 1 }, // Only creator present
          createdBy: req.user._id, // Only match creator can invite
        }).lean<MultiplayerMatch>();

        console.log('Match found:', !!match);

        if (match) {
          console.log('Match state:', match.state);
          console.log('Player count:', match.players.length);
          console.log('Created by:', match.createdBy._id?.toString());
          console.log('Current user:', req.user._id.toString());
        }

        if (!match) {
          return res.status(400).json({
            error: 'Match not found or you do not have permission to invite users'
          });
        }

        // Check if inviter is blocked by invitee or vice versa
        const [inviterBlockedByInvitee, inviteeBlockedByInviter] = await Promise.all([
          checkIfBlocked(invitedUserId, req.user._id.toString()),
          checkIfBlocked(req.user._id.toString(), invitedUserId)
        ]);

        if (inviterBlockedByInvitee || inviteeBlockedByInviter) {
          return res.status(400).json({ error: 'Cannot invite this user' });
        }

        // Check if invited user exists
        const invitedUser = await UserModel.findById(invitedUserId).lean<User>();

        if (!invitedUser) {
          return res.status(400).json({ error: 'Invited user not found' });
        }

        // Check if invited user is already in the match
        if (match.players.some(playerId => playerId.toString() === invitedUserId)) {
          return res.status(400).json({ error: 'User is already in this match' });
        }

        // Check if there's already a pending invitation for this user to this match
        const existingInvitation = await NotificationModel.findOne({
          userId: invitedUserId,
          type: NotificationType.MULTIPLAYER_INVITE,
          message: match.matchId,
          read: false, // Only check unread invitations
        }).lean();

        if (existingInvitation) {
          return res.status(400).json({ error: 'User has already been invited to this match' });
        }

        // Create notification
        try {
          await createMultiplayerInviteNotification(
            req.gameId,
            req.user._id,
            invitedUserId,
            match.matchId
          );

          return res.status(200).json({ success: true });
        } catch (error) {
          console.error('Error creating multiplayer invite notification:', error);

          return res.status(500).json({ error: 'Failed to send invitation' });
        }
      }
    }
  }
);
