-- Prevent duplicate customers for the same business + phone number
-- Phone numbers are normalised to E.164 format in the application layer
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_business_phone
ON customers(business_id, phone);
