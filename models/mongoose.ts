import mongoose from 'mongoose';
import Collection from './db/collection';
import Image from './db/image';
import Level from './db/level';
import PlayAttempt from './db/playAttempt';
import Record from './db/record';
import Review from './db/review';
import Stat from './db/stat';
import User from './db/user';
import UserConfig from './db/userConfig';
import CollectionSchema from './schemas/collectionSchema';
import ImageSchema from './schemas/imageSchema';
import LevelSchema from './schemas/levelSchema';
import PlayAttemptSchema from './schemas/playAttemptSchema';
import RecordSchema from './schemas/recordSchema';
import ReviewSchema from './schemas/reviewSchema';
import StatSchema from './schemas/statSchema';
import UserConfigSchema from './schemas/userConfigSchema';
import UserSchema from './schemas/userSchema';

// NB: need to initialize some models before they are referenced by other models
// (eg User before World since World has a User ref)
export const UserModel = mongoose.models.User || mongoose.model<User>('User', UserSchema);
export const CollectionModel = mongoose.models.World || mongoose.model<Collection>('World', CollectionSchema);
export const LevelModel = mongoose.models.Level || mongoose.model<Level>('Level', LevelSchema);
export const RecordModel = mongoose.models.Record || mongoose.model<Record>('Record', RecordSchema);
export const ReviewModel = mongoose.models.Review || mongoose.model<Review>('Review', ReviewSchema);
export const StatModel = mongoose.models.Stat || mongoose.model<Stat>('Stat', StatSchema);
export const ImageModel = mongoose.models.Image || mongoose.model<Image>('Image', ImageSchema);
export const UserConfigModel = mongoose.models.UserConfig || mongoose.model<UserConfig>('UserConfig', UserConfigSchema);
export const PlayAttemptModel = mongoose.models.PlayAttempt || mongoose.model<PlayAttempt>('PlayAttempt', PlayAttemptSchema);
