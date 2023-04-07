import User from './user';

export interface StripeEvent {
  created: number;
  customerId: string;
  data: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    object: Record<string, any>;
  };
  error: string;
  stripeId: string;
  type: string;
  userId: Types.ObjectId & User;
}
