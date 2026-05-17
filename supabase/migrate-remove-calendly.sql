-- Run once in Supabase SQL Editor to rename the column on the live database.
-- This converts the old text-based eligibility flag into a proper boolean.

ALTER TABLE team_members RENAME COLUMN calendly_url TO booking_eligible;

ALTER TABLE team_members
  ALTER COLUMN booking_eligible TYPE BOOLEAN
  USING CASE WHEN booking_eligible IS NULL OR booking_eligible = '' THEN FALSE ELSE TRUE END;

ALTER TABLE team_members ALTER COLUMN booking_eligible SET DEFAULT FALSE;
