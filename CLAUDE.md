# Bloom - AI-Powered Child Behavioral Assessment Platform

## Project Overview

**Bloom** is an AI-powered platform for understanding and supporting children's behavioral development. It enables parents, teachers, and caregivers to:
- Conduct AI-guided interviews to gather behavioral data
- Receive multi-framework psychological analysis
- Get instant guidance on handling specific situations
- Collaborate with multiple caregivers on a child's profile
- Track progress over time

**Live URL:** https://bloom.wunderkind.world (planned)
**GitHub:** https://github.com/Masssa75/bloom

## Tech Stack

- **Frontend:** Next.js 16 with TypeScript + Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **AI:** Claude API (Anthropic) + Kimi K2 (Moonshot) with web search
- **Deployment:** Netlify

## Autonomous Development Workflow

### The Golden Rule - ALWAYS Follow This Pattern:
```bash
1. Make code changes
2. git add -A && git commit -m "feat: description" && git push origin main
3. IMMEDIATELY start streaming logs:
   netlify logs:deploy
4. If build fails → fix and repeat
5. If build succeeds → verify deployment
```

### Your Full Permissions

You have COMPLETE autonomous control:

**Supabase**:
- ✅ Full management key access (in .env.local)
- ✅ Can modify schema, RLS policies, functions
- ✅ Can access service role for admin operations

**Netlify**:
- ✅ Full deployment access
- ✅ Can add/modify environment variables

**GitHub**:
- ✅ Full repository access
- ✅ Can push directly to main

**You are expected to work autonomously. Don't ask for permission - just do it!**

## Database Schema

```sql
-- Users (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Children
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
```

## App Structure

```
bloom/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── login/page.tsx           # Auth
│   │   ├── dashboard/page.tsx       # List of children
│   │   ├── child/
│   │   │   ├── [id]/page.tsx        # Child profile + Q&A
│   │   │   ├── [id]/new/page.tsx    # New session
│   │   │   └── [id]/docs/page.tsx   # View documents
│   │   └── api/
│   │       ├── auth/                # Auth endpoints
│   │       ├── children/            # Child CRUD
│   │       ├── sessions/            # Session management
│   │       ├── analyze/             # AI analysis
│   │       └── chat/                # AI Q&A
│   ├── components/
│   │   ├── auth/                    # Auth components
│   │   ├── child/                   # Child-related components
│   │   ├── chat/                    # Chat interface
│   │   └── ui/                      # Reusable UI components
│   ├── lib/
│   │   ├── supabase/               # Supabase client
│   │   ├── ai/                     # AI providers (Claude, Kimi)
│   │   └── utils/                  # Utilities
│   └── types/                      # TypeScript types
├── CLAUDE.md                       # This file
├── .env.local                      # Environment variables
└── ...
```

## Key Features

### 1. AI-Guided Interview
- AI asks questions one by one
- Adapts based on responses
- Generates transcript + summary

### 2. Dynamic Framework Analysis
- AI searches web for relevant frameworks
- Does NOT use fixed frameworks
- Finds best approach for specific situation

### 3. Session Summary System
- Every session generates a summary
- Summaries always loaded for context
- Full transcripts stored but not auto-loaded

### 4. Multi-Collaborator Support
- Creator can invite others
- Roles: admin, member, viewer
- All collaborators contribute to child's data

### 5. Instant Q&A
- Load all summaries for context
- Web search for latest techniques
- Provide actionable guidance

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Providers
ANTHROPIC_API_KEY=
MOONSHOT_API_KEY=

# Optional
NEXT_PUBLIC_APP_URL=https://bloom.wunderkind.world
```

## Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Push to GitHub (triggers Netlify deploy)
git add -A && git commit -m "feat: description" && git push origin main
```

## Session Log

### Session - November 30, 2025: Project Setup
- Created GitHub repo: https://github.com/Masssa75/bloom
- Initialized Next.js with TypeScript + Tailwind
- Installed Supabase + Anthropic SDK
- Created CLAUDE.md and .env.local template
- TODO: Create Supabase project, set up database schema, build auth flow
