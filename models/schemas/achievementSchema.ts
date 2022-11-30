import mongoose, { Mongoose } from 'mongoose';
import AchievementType from '../../constants/achievementType';
import Achievement from '../db/achievement';


const AchievementSchema = new mongoose.Schema<Achievement>({
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

export default AchievementSchema;