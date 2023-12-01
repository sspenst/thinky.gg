import { GameId } from '@root/constants/GameId';
import mongoose from 'mongoose';
import Campaign from '../db/campaign';

const CampaignSchema = new mongoose.Schema<Campaign>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  authorNote: {
    type: String,
    maxlength: 1024 * 5, // 5 kb limit seems reasonable
  },
  collections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Collection',
  }],
  gameId: {
    type: String,
    enum: GameId,
    required: false,
  },
  name: {
    type: String,
    minlength: 1,
    maxlength: 50,
    required: true,
  },
  slug: {
    type: String,
    required: true,
  },

}, {
  timestamps: true,
  collation: {
    locale: 'en_US',
    strength: 2,
  },
});

CampaignSchema.index({ slug: 1 }, { name: 'slug_index', unique: true });

export default CampaignSchema;
