-- Remove unused conversation_status enum values: completed, abandoned
-- PostgreSQL does not support dropping enum values; create new type, migrate column, drop old, rename.

CREATE TYPE "public"."conversation_status_new" AS ENUM ('active', 'closed', 'archived');

ALTER TABLE "conversations"
  ALTER COLUMN "status" TYPE "conversation_status_new"
  USING (
    CASE
      WHEN status::text IN ('completed', 'abandoned') THEN 'closed'::conversation_status_new
      ELSE status::text::conversation_status_new
    END
  );

DROP TYPE "public"."conversation_status";

ALTER TYPE "public"."conversation_status_new" RENAME TO "conversation_status";
