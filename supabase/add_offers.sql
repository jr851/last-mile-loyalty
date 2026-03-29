-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New Query)
-- Adds broadcast messaging and double-stamps support to the businesses table

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS active_broadcast text,
  ADD COLUMN IF NOT EXISTS double_stamps_active boolean NOT NULL DEFAULT false;

-- Optional: confirm it worked
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'businesses'
  AND column_name IN ('active_broadcast', 'double_stamps_active');
