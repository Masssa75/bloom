-- Add weight field for document importance/priority
-- Scale: 1-5 (5 = most important, 1 = archival)
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 3;

-- Add index for sorting by weight
CREATE INDEX IF NOT EXISTS idx_content_items_weight ON content_items(child_id, weight DESC);
