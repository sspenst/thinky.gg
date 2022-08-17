import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import Role from '../../constants/role';
import generateSlug from '../../helpers/generateSlug';
import { logger } from '../../helpers/logger';
import { LevelModel } from '../mongoose';

const UserSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  avatarUpdatedAt: {
    type: Number,
  },
  calc_records: {
    type: Number,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 50,
    validate: {
      validator: (v: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      }
    }
  },
  hideStatus: {
    type: Boolean,
  },
  last_visited_at: {
    type: Number,
  },
  name: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 50,
    validate: {
      validator: (v: string) => {
        return /^[a-zA-Z0-9_-]+$/.test(v);
      }
    }
  },
  password: {
    type: String,
    required: true,
  },
  psychopathId: {
    type: Number,
  },
  roles: {
    type: [String],
    enum: Role,
    default: [],
  },
  score: {
    type: Number,
    required: true,
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

UserSchema.index({ score: -1 });
UserSchema.index({ name: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ calc_records: -1 });

UserSchema.pre('updateOne', function(next) {
  this.options.runValidators = true;

  // if name has changed then call save on every level belonging to the user
  if (this.getUpdate().$set?.name) {
    LevelModel.find({
      userId: this._conditions._id,
    }, {}, { lean: false })
      .then(async (levels) => {
        await Promise.all(levels.map(async (level) => {
          level.slug = await generateSlug(level._id, this.getUpdate().$set.name, level.name);
          level.save();
        }));
        next();
      })
      .catch((err) => {
        logger.trace(err);
        next(err);
      });
  } else {
    next();
  }
});

const saltRounds = 10;

UserSchema.pre('save', function(next) {
  // Check if document is new or a new password has been set
  if (this.isNew || this.isModified('password')) {
    // Saving reference to this because of changing scopes
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const document = this;

    bcrypt.hash(document.password, saltRounds,
      function(err, hashedPassword) {
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

export default UserSchema;
