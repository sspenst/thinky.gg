import mongoose from 'mongoose';
import UserAuth, { AuthProvider } from '../db/userAuth';

const UserAuthSchema = new mongoose.Schema<UserAuth>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  provider: {
    type: String,
    required: true,
    enum: Object.values(AuthProvider),
  },
  providerId: {
    type: String,
    required: true,
  },
  providerUsername: {
    type: String,
    required: false,
  },
  providerEmail: {
    type: String,
    required: false,
  },
  providerAvatarUrl: {
    type: String,
    required: false,
  },
  accessToken: {
    type: String,
    required: false,
    select: false, // Don't include by default for security
  },
  refreshToken: {
    type: String,
    required: false,
    select: false, // Don't include by default for security
  },
  connectedAt: {
    type: Number,
    required: true,
  },
  updatedAt: {
    type: Number,
    required: true,
  },
}, {
  collation: {
    locale: 'en_US',
    strength: 2,
  },
});

// Compound index to ensure one provider per user per provider type
UserAuthSchema.index({ userId: 1, provider: 1 }, { unique: true });
// Index for quick lookups by provider and providerId
UserAuthSchema.index({ provider: 1, providerId: 1 });

export default UserAuthSchema;
