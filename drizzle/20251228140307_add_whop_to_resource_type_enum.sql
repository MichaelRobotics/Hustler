-- Migration to add 'WHOP' value to resource_type enum
-- This adds the new WHOP type for synced products

-- Add WHOP to the existing enum
ALTER TYPE "public"."resource_type" ADD VALUE IF NOT EXISTS 'WHOP';






