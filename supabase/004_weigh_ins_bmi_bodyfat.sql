-- Add BMI and body fat percentage columns to weigh_ins
alter table weigh_ins add column if not exists bmi numeric(4,1);
alter table weigh_ins add column if not exists body_fat_pct numeric(4,1);
