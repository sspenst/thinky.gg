import { EmailDigestSettingType } from '@root/constants/emailDigest';
import { GameId } from '@root/constants/GameId';
import NotificationType from '@root/constants/notificationType';
import bcrypt from 'bcryptjs';
import mongoose, { Types } from 'mongoose';
import { PASSWORD_SALTROUNDS } from '../../constants/passwordSaltRounds';
import Role from '../../constants/role';
import User from '../db/user';
import { LevelModel, UserConfigModel } from '../mongoose';

const UserSchema = new mongoose.Schema<User>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  avatarUpdatedAt: {
    type: Number,
  },
  bio: {
    type: String,
    required: false,
    maxlength: 256,
    select: false
  },
  disableConfetti: {
    type: Boolean,
    required: false,
    default: false,
  },
  disallowedEmailNotifications: {
    type: [{ type: String, enum: NotificationType }],
    required: true,
    default: [],
  },
  disallowedPushNotifications: {
    type: [{ type: String, enum: NotificationType }],
    required: true,
    default: [],
  },
  email: {
    type: String,
    required: true,
    select: false,
    minlength: 3,
    maxlength: 50,
    validate: {
      validator: (v: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      }
    }
  },
  emailDigest: {
    type: String,
    required: true,
    enum: EmailDigestSettingType,
    default: EmailDigestSettingType.DAILY,
  },
  emailConfirmationToken: {
    type: String,
    select: false,
  },
  emailConfirmed: {
    type: Boolean,
    default: false,
    select: false,
  },

  hideStatus: {
    type: Boolean,
  },
  last_visited_at: {
    type: Number,
  },
  lastGame: {
    type: String,
    enum: GameId,
    required: false,
  },
  mobileDeviceTokens: {
    type: [String],
    required: false,
    select: false,
    default: [],
    maxlength: 100, // max 100 devices @TODO: should probably 'rotate' this list and remove oldest device tokens on push of new one
  },
  ip_addresses_used: {
    type: [String],
    select: false,
  },
  name: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
    validate: {
      validator: (v: string) => {
        return /^[-a-zA-Z0-9_]+$/.test(v);
      }
    }
  },
  password: {
    type: String,
    select: false,
    required: true,
    minlength: 8,
    maxlength: 64,
  },
  roles: {
    type: [String],
    enum: Role,
    default: [],
  },
  stripeCustomerId: {
    type: String,
    required: false,
    select: false,
  },
  stripeGiftSubscriptions: {
    type: [String],
    required: false,
    select: false,
    default: [],
  },
  utm_source: {
    type: String,
    required: false,
    // length limit is 100 characters
    maxlength: 100,
    select: false,
  },
  ts: {
    type: Number,
  },
}, {
  collation: {
    locale: 'en_US',
    strength: 2,
  },
});

//UserSchema.index({ calcRankedSolves: -1 });
UserSchema.index({ score: -1 });
UserSchema.index({ name: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.pre('save', function(next) {
  // Check if document is new or a new password has been set
  if (this.isNew || this.isModified('password')) {
    // Saving reference to this because of changing scopes
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const document = this;

    bcrypt.hash(document.password as string, PASSWORD_SALTROUNDS,
      function(err, hashedPassword) {
        /* istanbul ignore if */
        if (err) {
          next(err);
        } else {
          document.password = hashedPassword;
          next();
        }
      }
    );
  } else {
    next();
  }
});

export async function calcCreatorCounts(gameId: GameId, userId: Types.ObjectId, session?: mongoose.ClientSession) {
  const levelsCreatedCountAgg = await LevelModel.aggregate([
    {
      $match:
      {
        isDeleted: { $ne: true },
        isDraft: false,
        userId: userId,
        gameId: gameId
      }
    },
    { $count: 'count' },
  ], { session: session });
  const levelsCreatedCount = levelsCreatedCountAgg.length > 0 ? levelsCreatedCountAgg[0].count : 0;

  await UserConfigModel.updateOne({ userId: userId, gameId: gameId }, {
    calcLevelsCreatedCount: levelsCreatedCount,
  }, { session: session });
}

export default UserSchema;
