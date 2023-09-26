import mongoose from 'mongoose';
import { StripeEvent } from '../db/stripeEvent';

const StripeEventSchema = new mongoose.Schema<StripeEvent>({
  created: {
    type: Number,
    required: true
  },
  customerId: {
    type: String,
    required: false
  },
  data: {
    type: Object,
    required: true
  },
  error: {
    type: String,
    required: false
  },
  stripeId: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
},
{
  timestamps: true
});

// add indices
StripeEventSchema.index({ stripeId: 1 });
StripeEventSchema.index({ type: 1 });
StripeEventSchema.index({ created: 1 });

export default StripeEventSchema;
