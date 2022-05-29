import mongoose from 'mongoose';
import Level from './db/level';
import Record from './db/record';
import Review from './db/review';
import Stat from './db/stat';
import User from './db/user';
import World from './db/world';
import LevelSchema from './schemas/levelSchema';
import RecordSchema from './schemas/recordSchema';
import ReviewSchema from './schemas/reviewSchema';
import StatSchema from './schemas/statSchema';
import UserSchema from './schemas/userSchema';
import WorldSchema from './schemas/worldSchema';

// NB: need to initialize some models before they are referenced by other models
// (eg User before World since World has a User ref)
export const UserModel = mongoose.models.User || mongoose.model<User>('User', UserSchema);
export const WorldModel = mongoose.models.World || mongoose.model<World>('World', WorldSchema);
export const LevelModel = mongoose.models.Level || mongoose.model<Level>('Level', LevelSchema);
export const RecordModel = mongoose.models.Record || mongoose.model<Record>('Record', RecordSchema);
export const ReviewModel = mongoose.models.Review || mongoose.model<Review>('Review', ReviewSchema);
export const StatModel = mongoose.models.Stat || mongoose.model<Stat>('Stat', StatSchema);
