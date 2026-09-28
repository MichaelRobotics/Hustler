-- Add products_synced field to users table to track if products have been synced for this user
ALTER TABLE users ADD COLUMN products_synced BOOLEAN DEFAULT FALSE NOT NULL;

-- Add index for efficient querying of users who need product sync
CREATE INDEX users_products_synced_idx ON users(products_synced);

-- Add composite index for experience and sync status
CREATE INDEX users_experience_products_synced_idx ON users(experience_id, products_synced);
