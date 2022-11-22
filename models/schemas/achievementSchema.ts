import mongoose, { Mongoose } from 'mongoose';
import NotificationType from '../../constants/notificationType';
import Achievement from '../db/achievement';


const AchievementSchema = new mongoose.Schema<Achievement>({
    type: {
        type: String,
        enum: NotificationType,
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