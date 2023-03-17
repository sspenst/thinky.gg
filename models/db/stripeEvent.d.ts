import User from './user';

export interface StripeEvent {
    stripeId: string;
    userId: Types.ObjectId & User;
    type: string;
    created: number;
    customerId: string;
    data: {
      object: Record<string, any>;
    };
    error: string
  }
