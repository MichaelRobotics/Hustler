-- Add card, text, and welcomeColor fields to themes table
ALTER TABLE "themes" 
ADD COLUMN IF NOT EXISTS "card" text,
ADD COLUMN IF NOT EXISTS "text" text,
ADD COLUMN IF NOT EXISTS "welcome_color" text;












































