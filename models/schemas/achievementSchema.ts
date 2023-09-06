import mongoose from 'mongoose';
import AchievementType from '../../constants/achievements/achievementType';
import Achievement from '../db/achievement';

const AchievementSchema = new mongoose.Schema<Achievement>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  type: {
    type: String,
    enum: AchievementType,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

AchievementSchema.index({ type: 1, userId: 1 }, { unique: true });

export default AchievementSchema;
