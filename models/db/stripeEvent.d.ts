import User from './user';

interface StripeEvent {
    stripeId: string;
    userId: Types.ObjectId & User;
    type: string;
    created: number;
    data: {
      object: Record<string, any>;
    };
    error: string
  }
