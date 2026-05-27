-- Add attachment columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name text;
