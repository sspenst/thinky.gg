import { GameId } from '@root/constants/GameId';
import bcrypt from 'bcryptjs';
import mongoose, { Types } from 'mongoose';
import Role from '../../constants/role';
import User from '../db/user';
import { LevelModel, UserModel } from '../mongoose';

export const USER_DEFAULT_PROJECTION = {
  _id: 1,
  avatarUpdatedAt: 1,
  hideStatus: 1,
  last_visited_at: 1,
  name: 1,
  roles: 1,
};

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
  /*// TODO: Move ALL the calcs to userConfig
  calcRankedSolves: {
    type: Number,
    required: true,
    default: 0,
  },
  calc_levels_created_count: {
    type: Number,
    default: 0,
  },

  calc_records: {
    type: Number,
    default: 0,
  },
  chapterUnlocked: {
    type: Number,
    default: 1,
  },*/
  email: {
    type: String,
    required: true,
    unique: true,
    select: false,
    minlength: 3,
    maxlength: 50,
    validate: {
      validator: (v: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      }
    }
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
  ip_addresses_used: {
    type: [String],
    select: false,
  },
  name: {
    type: String,
    required: true,
    unique: true,
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
  // TODO: Probably better to move roles to userConfig
  roles: {
    type: [String],
    enum: Role,
    default: [],
  },
  /* TODO: Move score to userConfig
  score: {
    type: Number,
    required: true,
    default: 0,
  },*/
  ts: {
    type: Number,
  },
}, {
  collation: {
    locale: 'en_US',
    strength: 2,
  },
});

UserSchema.index({ calcRankedSolves: -1 });
UserSchema.index({ score: -1 });
UserSchema.index({ name: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ calc_records: -1 });

export const PASSWORD_SALTROUNDS = process.env.NODE_ENV !== 'test' ? 10 : 1;

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

  await UserModel.updateOne({ _id: userId }, {
    calc_levels_created_count: levelsCreatedCount,
  }, { session: session });
}

export default UserSchema;
