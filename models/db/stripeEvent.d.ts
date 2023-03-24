import User from './user';

export interface StripeEvent {
  created: number;
  customerId: string;
  data: {
    object: Record<string, any>;
  };
  error: string;
  stripeId: string;
  type: string;
  userId: Types.ObjectId & User;
}
