import { LevelModel } from '../mongoose';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  isOfficial: {
    type: Boolean,
    required: true,
  },
  name: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  psychopathId: {
    type: Number,
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

const generateSlug = function(username:string, level_name:string):string {
  return username +
  '/' +
  level_name.replace(/\s+/g, '-').toLowerCase();
};
UserSchema.post('updateOne', async function() {
  // if name has changed then call save on every level belonging to the user
  if (this.getUpdate().$set.name) {
    const levels = await LevelModel.find({
      userId: this._conditions._id,
    }, {});
    levels.map((level)=>{
      level.slug = generateSlug(this.getUpdate().$set.name, level.name);
      level.save();
    });
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
