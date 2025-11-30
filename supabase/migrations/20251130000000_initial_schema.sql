-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policy - users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Children
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE children ENABLE ROW LEVEL SECURITY;

-- Collaborators (who can access which child)
CREATE TABLE collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member', 'viewer'
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, user_id)
);

ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;

-- Children policy - users can see children they collaborate on
CREATE POLICY "Users can view children they collaborate on" ON children
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM collaborators WHERE child_id = children.id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create children" ON children
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update children" ON children
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM collaborators WHERE child_id = children.id AND user_id = auth.uid() AND role = 'admin')
  );

-- Collaborators policy
CREATE POLICY "Users can view collaborators for their children" ON collaborators
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM children WHERE id = child_id AND created_by = auth.uid()) OR
    user_id = auth.uid()
  );

CREATE POLICY "Admins can manage collaborators" ON collaborators
  FOR ALL USING (
    EXISTS (SELECT 1 FROM children WHERE id = child_id AND created_by = auth.uid()) OR
    EXISTS (SELECT 1 FROM collaborators c2 WHERE c2.child_id = child_id AND c2.user_id = auth.uid() AND c2.role = 'admin')
  );

-- Sessions (interviews, analyses, Q&A)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL, -- 'interview', 'analysis', 'qa', 'progress_update'
  title TEXT,
  transcript TEXT, -- Full conversation
  summary TEXT, -- AI-generated summary (always loaded)
  metadata JSONB, -- Frameworks used, search queries, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sessions for their children" ON sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM children WHERE id = child_id AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM collaborators WHERE child_id = sessions.child_id AND user_id = auth.uid())
    ))
  );

CREATE POLICY "Users can create sessions for their children" ON sessions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM children WHERE id = child_id AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM collaborators WHERE child_id = sessions.child_id AND user_id = auth.uid() AND role IN ('admin', 'member'))
    ))
  );

-- Documents (HTML analysis outputs)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'framework_analysis', 'intervention_guide', etc.
  title TEXT,
  html TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents for their children" ON documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM children WHERE id = child_id AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM collaborators WHERE child_id = documents.child_id AND user_id = auth.uid())
    ))
  );

CREATE POLICY "Users can create documents for their children" ON documents
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM children WHERE id = child_id AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM collaborators WHERE child_id = documents.child_id AND user_id = auth.uid() AND role IN ('admin', 'member'))
    ))
  );
