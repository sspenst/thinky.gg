import mongoose from 'mongoose';
import Campaign from './db/campaign';
import Collection from './db/collection';
import EmailLog from './db/emailLog';
import Graph from './db/graph';
import Image from './db/image';
import KeyValue from './db/keyValue';
import Level from './db/level';
import MultiplayerMatch from './db/multiplayerMatch';
import MultiplayerProfile from './db/multiplayerPlayer';
import Notification from './db/notification';
import PlayAttempt from './db/playAttempt';
import QueueMessage from './db/queueMessage';
import Record from './db/record';
import Review from './db/review';
import Stat from './db/stat';
import User from './db/user';
import UserConfig from './db/userConfig';
import CampaignSchema from './schemas/campaignSchema';
import CollectionSchema from './schemas/collectionSchema';
import EmailLogSchema from './schemas/emailLogSchema';
import GraphSchema from './schemas/graphSchema';
import ImageSchema from './schemas/imageSchema';
import KeyValueSchema from './schemas/keyValueSchema';
import LevelSchema from './schemas/levelSchema';
import MultiplayerMatchSchema from './schemas/multiplayerMatchSchema';
import MultiplayerPlayerSchema from './schemas/multiplayerPlayerSchema';
import NotificationSchema from './schemas/notificationSchema';
import PlayAttemptSchema from './schemas/playAttemptSchema';
import QueueMessageSchema from './schemas/queueMessageSchema';
import RecordSchema from './schemas/recordSchema';
import ReviewSchema from './schemas/reviewSchema';
import StatSchema from './schemas/statSchema';
import UserConfigSchema from './schemas/userConfigSchema';
import UserSchema from './schemas/userSchema';

// NB: need to initialize some models before they are referenced by other models
// (eg User before Collection since Collection has a User ref)
export const UserModel = mongoose.models.User || mongoose.model<User>('User', UserSchema);
export const CollectionModel = mongoose.models.Collection || mongoose.model<Collection>('Collection', CollectionSchema);
export const LevelModel = mongoose.models.Level || mongoose.model<Level>('Level', LevelSchema);
export const RecordModel = mongoose.models.Record || mongoose.model<Record>('Record', RecordSchema);
export const ReviewModel = mongoose.models.Review || mongoose.model<Review>('Review', ReviewSchema);
export const StatModel = mongoose.models.Stat || mongoose.model<Stat>('Stat', StatSchema);
export const ImageModel = mongoose.models.Image || mongoose.model<Image>('Image', ImageSchema);
export const UserConfigModel = mongoose.models.UserConfig || mongoose.model<UserConfig>('UserConfig', UserConfigSchema);
export const PlayAttemptModel = mongoose.models.PlayAttempt || mongoose.model<PlayAttempt>('PlayAttempt', PlayAttemptSchema);
export const MultiplayerMatchModel = mongoose.models.MultiplayerMatch || mongoose.model<MultiplayerMatch>('MultiplayerMatch', MultiplayerMatchSchema);
export const MultiplayerPlayerModel = mongoose.models.MultiplayerPlayer || mongoose.model<MultiplayerProfile>('MultiplayerPlayer', MultiplayerPlayerSchema);
export const NotificationModel = mongoose.models.Notification || mongoose.model<Notification>('Notification', NotificationSchema);
export const QueueMessageModel = mongoose.models.QueueMessage || mongoose.model<QueueMessage>('QueueMessage', QueueMessageSchema);
export const KeyValueModel = mongoose.models.KeyValue || mongoose.model<KeyValue>('KeyValue', KeyValueSchema);
export const GraphModel = mongoose.models.Graph || mongoose.model<Graph>('Graph', GraphSchema);
export const CampaignModel = mongoose.models.Campaign || mongoose.model<Campaign>('Campaign', CampaignSchema);
export const EmailLogModel = mongoose.models.EmailLog || mongoose.model<EmailLog>('EmailLog', EmailLogSchema);
