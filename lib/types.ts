export interface Business {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string;
  reward_stamps_needed: number;
  reward_description: string;
  stamp_earn_description: string;
  staff_pin: string;
  active_broadcast: string | null;
  double_stamps_active: boolean;
  created_at: string;
  updated_at: string;
  plan_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string;
  trial_ends_at: string | null;
  is_pilot: boolean;
}

export interface Customer {
  id: string;
  business_id: string;
  phone: string;
  name: string | null;
  stamps: number;
  wallet_pass_serial: string | null;
  created_at: string;
  updated_at: string;
}

export interface Redemption {
  id: string;
  customer_id: string;
  business_id: string;
  code: string;
  expires_at: string;
  confirmed_at: string | null;
  created_at: string;
}

export interface PosIntegration {
  id: string;
  business_id: string;
  provider: "square" | "toast" | "clover" | "lightspeed";
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  merchant_id: string | null;
  location_id: string | null;
  webhook_secret: string | null;
  connected_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  aud: string;
  role: string;
  email_confirmed_at: string | null;
  phone: string | null;
  confirmation_sent_at: string | null;
  confirmed_at: string | null;
  last_sign_in_at: string | null;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  identities: unknown[];
  created_at: string;
  updated_at: string;
}
