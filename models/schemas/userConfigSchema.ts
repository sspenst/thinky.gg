import UserConfig from '../db/userConfig';
import mongoose from 'mongoose';

const UserConfigSchema = new mongoose.Schema<UserConfig>(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    sidebar: {
      type: Boolean,
      required: true,
    },
    theme: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
  }
);

export default UserConfigSchema;
