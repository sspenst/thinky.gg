import { GameId } from '@root/constants/GameId';
import mongoose from 'mongoose';
import Cache from '../db/cache';

const CacheSchema = new mongoose.Schema<Cache>({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  tag: {
    type: String,
    required: true,
  },
  gameId: {
    type: String,
    enum: GameId,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expireAt: {
    type: Date,
    required: true,
  },
});

CacheSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 }); // TTL index on expireAt

export default CacheSchema;
