import mongoose from 'mongoose';
import { StripeEvent } from '../db/stripeEvent';

const stripeEventSchema = new mongoose.Schema<StripeEvent>({
  stripeId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true
  },
  created: {
    type: Number,
    required: true
  },
  data: {
    type: Object,
    required: true
  },
  error: {
    type: String,
    required: false
  }
});

// add indices
stripeEventSchema.index({ stripeId: 1 });
stripeEventSchema.index({ type: 1 });
stripeEventSchema.index({ created: 1 });

export default stripeEventSchema;
