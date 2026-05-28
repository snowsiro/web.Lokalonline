-- Run this in Supabase SQL Editor to add new columns to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS website text;

-- Legal entity fields (added for Impressum/Datenschutz auto-generation)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS legal_type text DEFAULT 'einzelunternehmer',
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS legal_form text,
  ADD COLUMN IF NOT EXISTS geschaeftsfuehrer text,
  ADD COLUMN IF NOT EXISTS fn_number text,
  ADD COLUMN IF NOT EXISTS uid_number text;
