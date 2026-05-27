-- Run this in Supabase SQL Editor to add new columns to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS website text;
