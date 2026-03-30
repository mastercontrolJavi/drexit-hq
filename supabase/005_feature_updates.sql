-- Add target_quarter column to goals table
ALTER TABLE goals ADD COLUMN IF NOT EXISTS target_quarter text;

-- Migrate old budget category names to new names
UPDATE budget_entries SET category = 'Restaurants' WHERE category = 'Food';
UPDATE budget_entries SET category = 'Transportation' WHERE category = 'Transport';
UPDATE budget_entries SET category = 'Entertainment' WHERE category = 'Going Out';
