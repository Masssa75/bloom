-- Migration: Add invitations table for pending invites
-- Date: December 18, 2025

-- Create invitations table for pending invites (when user doesn't exist yet)
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member', 'viewer'
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ, -- null until accepted
  UNIQUE(child_id, email) -- can only invite same email once per child
);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Policies for invitations
CREATE POLICY "Child owners can view invitations" ON invitations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM children WHERE id = child_id AND created_by = auth.uid())
  );

CREATE POLICY "Invited users can view their invitations" ON invitations
  FOR SELECT USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Child owners can create invitations" ON invitations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM children WHERE id = child_id AND created_by = auth.uid())
  );

CREATE POLICY "Child owners can delete invitations" ON invitations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM children WHERE id = child_id AND created_by = auth.uid())
  );

-- Function to accept invitation (converts to collaborator)
CREATE OR REPLACE FUNCTION accept_invitation(invitation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  inv RECORD;
BEGIN
  -- Get the invitation
  SELECT * INTO inv FROM invitations
  WHERE id = invitation_id
    AND accepted_at IS NULL
    AND email = (SELECT email FROM profiles WHERE id = auth.uid());

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Create collaborator entry
  INSERT INTO collaborators (child_id, user_id, role, invited_by)
  VALUES (inv.child_id, auth.uid(), inv.role, inv.invited_by)
  ON CONFLICT (child_id, user_id) DO NOTHING;

  -- Mark invitation as accepted
  UPDATE invitations SET accepted_at = NOW() WHERE id = invitation_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-accept invitations on user signup/login
CREATE OR REPLACE FUNCTION auto_accept_invitations()
RETURNS TRIGGER AS $$
BEGIN
  -- Accept all pending invitations for this user's email
  INSERT INTO collaborators (child_id, user_id, role, invited_by)
  SELECT i.child_id, NEW.id, i.role, i.invited_by
  FROM invitations i
  WHERE i.email = NEW.email AND i.accepted_at IS NULL
  ON CONFLICT (child_id, user_id) DO NOTHING;

  -- Mark invitations as accepted
  UPDATE invitations
  SET accepted_at = NOW()
  WHERE email = NEW.email AND accepted_at IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-accept on profile creation
DROP TRIGGER IF EXISTS on_profile_created_accept_invitations ON profiles;
CREATE TRIGGER on_profile_created_accept_invitations
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION auto_accept_invitations();
