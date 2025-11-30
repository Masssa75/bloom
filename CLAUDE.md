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

### Real-time Build Monitoring
```bash
# Stream deployment logs in real-time
netlify logs:deploy

# Get deployment details (update site_id once Netlify is connected)
netlify api listSiteDeploys --data '{"site_id": "YOUR_SITE_ID"}' | jq '.[0:3]'

# Get specific deployment error
netlify api getSiteDeploy --data '{"site_id": "YOUR_SITE_ID", "deploy_id": "DEPLOY_ID"}' | jq '.error_message'
```

### Resolving Git Conflicts
```bash
# Option 1: Reset to remote (loses local commits)
git fetch origin
git reset --hard origin/main
git push origin main --force

# Option 2: Merge remote changes
git fetch origin
git merge origin/main
# Resolve conflicts manually
git add .
git commit -m "chore: merge remote changes"
git push origin main

# Option 3: Rebase local commits on top of remote
git fetch origin
git rebase origin/main
# Resolve conflicts if any
git rebase --continue
git push origin main --force
```

## Communication Style
- Ask for clarification when requirements are ambiguous
- Provide options and recommendations before implementing
- Explain technical decisions and trade-offs
- Keep responses concise but informative

## Session Management
- **WRAP keyword**: End session with cleanup - update logs, document progress, mark todos complete
- **File deprecation**: Mark old files immediately when creating new versions with reason
- **Incomplete work**: Document current state and next steps in session logs

## The Sunbeam Debugging Protocol
When debugging issues, follow this systematic 5-step approach:

### Step 1: Browser Testing (Always First!)
- Manually reproduce the issue in browser
- Note exact steps to reproduce
- Take screenshots/record console errors
- Never claim something works without verification

### Step 2: Investigate Root Cause
- Trace data flow through components
- Check API responses
- Verify state management
- Identify exact failure point

### Step 3: Implement Minimal Fix
- Fix only what's broken
- Avoid refactoring unless necessary
- Test fix immediately
- Document any assumptions

### Step 4: Verify with Automation
- Create browser automation test
- Verify fix works consistently
- Test edge cases
- Ensure no regressions

### Step 5: Document Everything
- Update CLAUDE.md immediately
- Note what was broken and why
- Document the fix approach
- Update test documentation

## Autonomous Working Principles

### ✅ ALWAYS Do Without Asking:
- Deploy to production (for prototyping/MVP stages)
- Fix bugs and errors
- Run tests and diagnostics
- Create automation scripts
- Update documentation
- Add console.log statements for debugging
- Create backup branches
- Try up to 10 different approaches to solve problems
- Update dependencies if needed
- Create new API endpoints
- Modify database schema for features
- Implement security best practices

### ❌ ALWAYS Ask Before:
- Deleting user data
- Major architectural refactors
- Rolling back deployed changes
- Setting up paid services
- Changing core business logic
- Removing existing features
- Modifying authentication flow

### 🤔 Use Judgment For:
- Performance optimizations (minor = do, major = ask)
- UI/UX changes (small = do, significant = ask)
- New dependencies (common = do, unusual = ask)

## Development Rules

### Critical Rules (NEVER BREAK THESE):
1. **Never create fallback systems** without explicit request
2. **Always create backup** before major changes
3. **Do only what's asked** - nothing more, nothing less
4. **Never create files** unless absolutely necessary
5. **Always prefer editing** existing files to creating new ones
6. **API keys go in .env file** - never in code or CLAUDE.md
7. **Never proactively create documentation files** unless requested

### File Management:
- Mark deprecated files immediately in CLAUDE.md
- Use git branches for major changes
- Keep todo list updated in real-time
- Document file purposes clearly

### Testing Approach:
- Always verify in browser first
- Create automated tests for critical paths
- Test edge cases and error states
- Document test scenarios

---

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

## Supabase Project

- **Project Ref:** aloekdzacexftdpewxrd
- **Dashboard:** https://supabase.com/dashboard/project/aloekdzacexftdpewxrd
- **API URL:** https://aloekdzacexftdpewxrd.supabase.co
- **Region:** Southeast Asia (Singapore)

## Session Log

### Session - November 30, 2025: Project Setup
- Created GitHub repo: https://github.com/Masssa75/bloom
- Initialized Next.js with TypeScript + Tailwind
- Installed Supabase + Anthropic SDK
- Created CLAUDE.md and .env.local template
- Created Supabase project (aloekdzacexftdpewxrd)
- Set up database schema with tables: profiles, children, collaborators, sessions, documents
- Configured RLS policies for all tables
- Created auto-profile trigger on user signup
- Next: Build auth flow, create landing page
