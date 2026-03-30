-- Plans reference table
CREATE TABLE public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_monthly integer NOT NULL DEFAULT 0, -- in cents
  currency text NOT NULL DEFAULT 'usd',
  stripe_price_id text,
  member_limit integer, -- null = unlimited
  features jsonb NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0
);

-- Seed the 4 tiers
INSERT INTO public.plans (id, name, description, price_monthly, member_limit, features, sort_order) VALUES
  ('free', 'Free', 'Get started with the basics', 0, 50, '{"staff_links": 1, "broadcasts": false, "double_stamps": false, "analytics": false, "api_access": false}', 0),
  ('growth', 'Growth', 'Everything you need to grow', 2900, 500, '{"staff_links": 999, "broadcasts": true, "double_stamps": true, "analytics": false, "api_access": false}', 1),
  ('pro', 'Pro', 'For serious loyalty programmes', 7900, null, '{"staff_links": 999, "broadcasts": true, "double_stamps": true, "analytics": true, "api_access": true}', 2),
  ('enterprise', 'Enterprise', 'Custom solutions for larger businesses', 0, null, '{"staff_links": 999, "broadcasts": true, "double_stamps": true, "analytics": true, "api_access": true, "multi_location": true, "dedicated_support": true}', 3);

-- Add plan tracking to businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS plan_id text NOT NULL DEFAULT 'free' REFERENCES public.plans(id);
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active'; -- active, past_due, cancelled
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_pilot boolean NOT NULL DEFAULT false;

-- RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plans" ON public.plans FOR SELECT USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_businesses_stripe_customer ON public.businesses(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_businesses_plan ON public.businesses(plan_id);
