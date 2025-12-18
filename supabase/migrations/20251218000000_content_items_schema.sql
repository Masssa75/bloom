-- Migration: Add content_items table and update schema for MVP
-- Date: December 18, 2025

-- Add role to profiles (admin, teacher, parent)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'teacher';

-- Add context_index to children (the "CLAUDE.md" for each child)
ALTER TABLE children ADD COLUMN IF NOT EXISTS context_index TEXT;
ALTER TABLE children ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE children ADD COLUMN IF NOT EXISTS notes TEXT;

-- Drop old tables (they're empty and we're redesigning)
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

-- Create content_items table - all content in one place
CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),

  -- Content type classification
  type TEXT NOT NULL,           -- 'incident', 'session', 'document', 'observation'
  subtype TEXT,                 -- 'teacher_interview', 'parent_interview', 'teacher_chat',
                                -- 'framework_analysis', 'intervention_guide', 'quick_reference',
                                -- 'alsup', 'case_overview', etc.

  -- Content hierarchy (index pattern)
  title TEXT NOT NULL,
  one_liner TEXT,               -- Short summary for context_index
  summary TEXT,                 -- Condensed version (loaded for AI context)
  full_content TEXT,            -- Complete content (loaded on demand)

  -- Flexible metadata
  metadata JSONB DEFAULT '{}',  -- {severity, frameworks_used, action_items, etc.}

  -- For incidents specifically
  incident_date TIMESTAMPTZ,    -- When the incident occurred
  other_children UUID[],        -- Other children involved

  -- For sessions (AI conversations)
  messages JSONB,               -- [{role, content, timestamp}] for chat sessions
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'archived'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- Content items policies
CREATE POLICY "Users can view content for children they have access to" ON content_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM children c
      WHERE c.id = content_items.child_id AND (
        c.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM collaborators WHERE child_id = c.id AND user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can create content for children they have access to" ON content_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM children c
      WHERE c.id = content_items.child_id AND (
        c.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM collaborators WHERE child_id = c.id AND user_id = auth.uid() AND role IN ('admin', 'member'))
      )
    )
  );

CREATE POLICY "Users can update content they created or have admin access to" ON content_items
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM children c
      WHERE c.id = content_items.child_id AND (
        c.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM collaborators WHERE child_id = c.id AND user_id = auth.uid() AND role = 'admin')
      )
    )
  );

CREATE POLICY "Admins can delete content" ON content_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM children c
      WHERE c.id = content_items.child_id AND (
        c.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM collaborators WHERE child_id = c.id AND user_id = auth.uid() AND role = 'admin')
      )
    )
  );

-- Create indexes for common queries
CREATE INDEX idx_content_items_child_id ON content_items(child_id);
CREATE INDEX idx_content_items_type ON content_items(type);
CREATE INDEX idx_content_items_created_at ON content_items(created_at DESC);
CREATE INDEX idx_content_items_incident_date ON content_items(incident_date DESC) WHERE type = 'incident';

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_content_items_updated_at
  BEFORE UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Also add updated_at to children table
ALTER TABLE children ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TRIGGER update_children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
