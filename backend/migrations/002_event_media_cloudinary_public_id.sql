BEGIN;

ALTER TABLE event_media
ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;

COMMIT;
