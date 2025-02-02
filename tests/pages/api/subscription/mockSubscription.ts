import Stripe from 'stripe';

const mockSubscription: Stripe.Subscription = {
  id: 'sub_123',
  object: 'subscription',
  application: null,
  application_fee_percent: null,
  automatic_tax: {
    disabled_reason: null,
    enabled: false,
    liability: null,
  },
  billing_cycle_anchor: 1690174333,
  billing_cycle_anchor_config: null,
  billing_thresholds: null,
  cancel_at: null,
  cancel_at_period_end: false,
  canceled_at: null,
  cancellation_details: {
    comment: null,
    feedback: null,
    reason: null
  },
  collection_method: 'charge_automatically',
  created: 1690174333,
  currency: 'usd',
  current_period_end: 1692852733,
  current_period_start: 1690174333,
  customer: 'cus_123',
  days_until_due: null,
  default_payment_method: 'pm_123',
  default_source: null,
  default_tax_rates: [],
  description: null,
  discount: null,
  discounts: [],
  ended_at: null,
  invoice_settings: {
    account_tax_ids: null,
    issuer: {
      type: 'self',
    },
  },
  items: {
    object: 'list',
    data: [
      {
        id: 'si_123',
        object: 'subscription_item',
        billing_thresholds: null,
        created: 1690174334,
        discounts: [],
        metadata: {},
        plan: {
          id: 'price_123',
          object: 'plan',
          active: true,
          aggregate_usage: null,
          amount: 300,
          amount_decimal: '300',
          billing_scheme: 'per_unit',
          created: 1678917701,
          currency: 'usd',
          interval: 'month',
          interval_count: 1,
          livemode: false,
          metadata: {},
          meter: null,
          nickname: null,
          product: 'prod_123',
          tiers_mode: null,
          transform_usage: null,
          trial_period_days: null,
          usage_type: 'licensed'
        },
        price: {
          id: 'price_123',
          object: 'price',
          active: true,
          billing_scheme: 'per_unit',
          created: 1678917701,
          currency: 'usd',
          custom_unit_amount: null,
          livemode: false,
          lookup_key: null,
          metadata: {},
          nickname: null,
          product: 'prod_123',
          recurring: {
            aggregate_usage: null,
            interval: 'month',
            interval_count: 1,
            meter: null,
            trial_period_days: null,
            usage_type: 'licensed'
          },
          tax_behavior: 'unspecified',
          tiers_mode: null,
          transform_quantity: null,
          type: 'recurring',
          unit_amount: 300,
          unit_amount_decimal: '300'
        },
        quantity: 1,
        subscription: 'sub_123',
        tax_rates: []
      }
    ],
    has_more: false,
    url: '/v1/subscription_items?subscription=sub_123'
  },
  latest_invoice: 'in_123',
  livemode: false,
  metadata: {},
  next_pending_invoice_item_invoice: null,
  on_behalf_of: null,
  pause_collection: null,
  payment_settings: {
    payment_method_options: null,
    payment_method_types: null,
    save_default_payment_method: 'off'
  },
  pending_invoice_item_interval: null,
  pending_setup_intent: null,
  pending_update: null,
  schedule: null,
  start_date: 1690174333,
  status: 'active',
  test_clock: null,
  transfer_data: null,
  trial_end: null,
  trial_settings: {
    end_behavior: {
      missing_payment_method: 'create_invoice'
    }
  },
  trial_start: null
};

export default mockSubscription;
