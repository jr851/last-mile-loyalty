export interface Business {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string; // hex colour
  reward_stamps_needed: number;
  reward_description: string;
  staff_pin: string;
  active_broadcast: string | null;
  double_stamps_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  phone: string;
  name: string | null;          // optional at join
  stamps: number;
  wallet_pass_serial: string | null;
  created_at: string;
  updated_at: string;
}

export interface Redemption {
  id: string;
  customer_id: string;
  business_id: string;
  code: string;                 // 3-digit numeric string e.g. "847"
  expires_at: string;           // 7 days from creation
  confirmed_at: string | null;
  created_at: string;
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
