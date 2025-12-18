# Bloom - AI-Powered Child Behavioral Assessment Platform

## Project Overview

**Bloom** is an AI-powered platform for understanding and supporting children's behavioral development. It enables parents, teachers, and caregivers to:
- Store and organize behavioral case files and assessments
- Report and track behavioral incidents
- Collaborate with multiple caregivers on a child's profile
- Get AI-powered guidance using case context (Kimi K2 integration)

**Live URL:** https://bloom.wunderkind.world
**GitHub:** https://github.com/Masssa75/bloom

## Current State (December 18, 2025)

### What's Built ✅
- **Auth**: Login/signup with email confirmation (Supabase Auth)
- **Dashboard**: List children, quick actions
- **Child Profiles**: View case files organized by category
- **Add Child**: Create new children
- **Incident Reporting**: Log incidents with severity, context, response
- **Document Viewer**: View HTML/markdown case files
- **Collaborator Invites**: Invite others by email, auto-accept on signup
- **Document Organization**: Collapsible categories, weight-based sorting
- **AI Chat**: Kimi K2 integration with tool calling for case file access
- **Playwright Tests**: E2E tests for add-child and invite flows

### What's NOT Built Yet ❌
- AI-guided interviews
- Framework analysis generation
- Progress tracking over time
- Chat history persistence

## Tech Stack

- **Frontend:** Next.js 16.0.10 with TypeScript + Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **AI:** Kimi K2 (Moonshot) with tool calling + web search
- **Deployment:** Netlify
- **Testing:** Playwright

## Quick Start

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Run Playwright tests
npx playwright test

# Deploy (auto-deploys on push, or manual)
netlify deploy --prod
```

## Database Schema (Current)

```sql
-- Users (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'teacher',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Children
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER,
  date_of_birth DATE,
  notes TEXT,
  context_index TEXT,  -- AI context summary (like CLAUDE.md per child)
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

-- Invitations (pending invites for users who may not exist yet)
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(child_id, email)
);

-- Content Items (unified storage for all content types)
CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),

  -- Classification
  type TEXT NOT NULL,           -- 'incident', 'session', 'document'
  subtype TEXT,                 -- 'framework_analysis', 'intervention_guide', 'quick_reference', etc.

  -- Content (index pattern)
  title TEXT NOT NULL,
  one_liner TEXT,               -- Short summary for listings
  summary TEXT,                 -- Condensed version (for AI context)
  full_content TEXT,            -- Complete content (loaded on demand)

  -- Importance (1-5 scale)
  weight INTEGER DEFAULT 3,     -- 5=essential, 4=frequent, 3=regular, 2=occasional, 1=archival

  -- Metadata
  metadata JSONB DEFAULT '{}',  -- {severity, priority, content_type, source_file, etc.}
  incident_date TIMESTAMPTZ,
  other_children UUID[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Document Subtypes & Weights

| Subtype | Description | Typical Weight |
|---------|-------------|----------------|
| `quick_reference` | Essential daily reference | 5 |
| `case_overview` | One-page summary | 5 |
| `intervention_guide` | How to respond to situations | 4-5 |
| `framework_analysis` | Behavioral assessments (ALSUP, etc.) | 3-4 |
| `parent_communication` | Materials for parents | 2-3 |
| `interview_guide` | Interview frameworks | 2 |
| `session_transcript` | Interview records | 1 |
| `case_log` | Chronological log | 2 |
| `observation_tool` | Checklists | 3 |

## App Structure

```
bloom/
├── src/
│   ├── app/
│   │   ├── page.tsx                      # Landing page
│   │   ├── login/page.tsx                # Auth (login/signup)
│   │   ├── dashboard/page.tsx            # Child list + quick actions
│   │   ├── incident/new/page.tsx         # Report incident form
│   │   ├── child/
│   │   │   ├── new/page.tsx              # Add child form
│   │   │   ├── [id]/page.tsx             # Child profile with docs
│   │   │   └── [id]/doc/[docId]/page.tsx # Document viewer
│   │   └── api/
│   │       ├── chat/route.ts             # AI chat with Kimi K2
│   │       ├── invite/route.ts           # Invite management API
│   │       └── kimi/child/[childId]/     # Kimi document access API
│   ├── components/
│   │   ├── ChatInterface.tsx             # Floating chat UI
│   │   ├── CollaboratorsSection.tsx      # Invite & manage collaborators
│   │   ├── DocumentCategories.tsx        # Collapsible doc categories
│   │   └── PendingInvitations.tsx        # Accept/decline invites
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts                 # Browser client (singleton)
│   │       └── server.ts                 # Server client
│   └── middleware.ts                     # Auth middleware
├── scripts/
│   ├── import-michael-docs.ts            # Import case files from BambooValley
│   └── update-weights.ts                 # Update document weights
├── tests/
│   ├── add-child.spec.ts                 # E2E test for adding children
│   └── invite.spec.ts                    # E2E test for invite flow
├── supabase/migrations/                  # Database migrations
└── playwright.config.ts
```

## Test Account

For Playwright tests and manual testing:
- **Email:** claude-test@bloom.wunderkind.world
- **Password:** TestPassword123!

## Useful Scripts

```bash
# Import case files for a child (update CHILD_ID in script)
npx tsx scripts/import-michael-docs.ts

# Update document weights
npx tsx scripts/update-weights.ts

# Run all Playwright tests
npx playwright test

# Run specific test
npx playwright test tests/add-child.spec.ts
```

## Key Implementation Details

### Supabase Client (Singleton)
The browser client uses singleton pattern to avoid double-click issues:
```typescript
// src/lib/supabase/client.ts
let client: SupabaseClient | null = null
export function createClient() {
  if (client) return client
  client = createBrowserClient(...)
  return client
}
```

### Invite Flow
1. Owner invites email via `/api/invite` POST
2. If user exists → auto-add as collaborator
3. If user doesn't exist → store in `invitations` table
4. On signup → trigger auto-accepts pending invitations
5. Invited user sees shared children on dashboard

### Document Weight System
- Weight 5: Essential daily reference (★ star shown in UI)
- Weight 4: Frequently needed guides
- Weight 3: Regular use documents
- Weight 2: Occasional reference
- Weight 1: Archival (transcripts, logs)

Documents sorted by weight within each category.

### AI Chat Integration (Kimi K2)

The chat feature uses Kimi K2 with tool calling to access case files:

**Architecture:**
1. User sends message via floating chat UI
2. `/api/chat` calls Kimi K2 with tool definitions
3. Kimi decides which documents to fetch
4. Tool calls executed against Supabase
5. Kimi synthesizes response with case context
6. Streaming response displayed to user

**Available Tools:**
- `get_child_overview` - Returns child profile + document list
- `get_document` - Fetches full content of specific document
- `web_search` - Search web for behavioral strategies

**API Endpoints for Kimi:**
```
GET /api/kimi/child/[childId]                    # Child info + doc list
GET /api/kimi/child/[childId]/documents          # List with filters
GET /api/kimi/child/[childId]/documents/[docId]  # Full document
POST /api/kimi/child/[childId]/documents         # Batch fetch by IDs
```

**Authentication:** API key via `?api_key=` or `x-api-key` header
**Env var:** `KIMI_API_KEY` (for external access)

---

## Autonomous Development Workflow

### The Golden Rule - ALWAYS Follow This Pattern:
```bash
1. Make code changes
2. npm run build  # Verify it compiles
3. git add -A && git commit -m "feat: description" && git push origin main
4. netlify deploy --prod  # Or wait for auto-deploy
5. Verify in browser
```

### Your Full Permissions

**Supabase**: Full management key access, can modify schema/RLS/functions
**Netlify**: Full deployment access
**GitHub**: Push directly to main

**Work autonomously. Don't ask for permission - just do it!**

### Supabase CLI Commands
```bash
# Push migrations to remote
supabase db push --linked

# Pull remote schema
supabase db pull
```

---

## Project Info

### Supabase
- **Project Ref:** aloekdzacexftdpewxrd
- **Dashboard:** https://supabase.com/dashboard/project/aloekdzacexftdpewxrd
- **API URL:** https://aloekdzacexftdpewxrd.supabase.co

### Netlify
- **Site ID:** f7be0728-c390-48e4-965c-de2a5af7162e
- **Admin URL:** https://app.netlify.com/projects/bloom-wunderkind

---

## Session Log

### Session - December 18, 2025 (AI Chat): Main Feature Complete

**Completed:**
- Built AI Chat with Kimi K2 integration
  - `/api/chat` route with streaming + tool calling loop
  - `ChatInterface` floating component on child profile
  - Tools: get_child_overview, get_document, web_search
  - Kimi fetches relevant case files to answer questions
- Created Kimi API endpoints for document access:
  - `/api/kimi/child/[childId]` - child overview + doc list
  - `/api/kimi/child/[childId]/documents` - list/batch fetch
  - `/api/kimi/child/[childId]/documents/[docId]` - single doc
- Added KIMI_API_KEY for external API access

**The main product feature is now live!**

---

### Session - December 18, 2025 (Continued): Features & Polish

**Completed:**
- Fixed add child flow (RLS policies were actually working)
- Added collaborator invite system:
  - `invitations` table for pending invites
  - `/api/invite` endpoint (POST/GET/DELETE)
  - `CollaboratorsSection` component on child profile
  - `PendingInvitations` component on dashboard
  - Auto-accept trigger on user signup
- Added collapsible document categories:
  - Documents grouped by subtype
  - Expand/collapse with icons and colors
  - Count badges per category
- Added document weight/importance system:
  - 1-5 scale (5=essential, 1=archival)
  - Sorted by weight within categories
  - ★ star indicator for weight-5 docs
- Fixed double-click issue (Supabase client singleton)
- Fixed back button on incident page (router.back())
- Imported Michael's 24 case files with proper weights
- Created Playwright tests (add-child, invite flows)

**Test Account Created:**
- claude-test@bloom.wunderkind.world / TestPassword123!

---

### Session - December 18, 2025: MVP Implementation

**Completed:**
- Redesigned database with content_items table
- Built complete MVP UI (auth, dashboard, incidents, child profiles)
- Updated Next.js 16.0.5 → 16.0.10 for security
- Fixed Supabase auth redirect and email branding
- Initial Michael case file migration

---

### Session - December 3, 2025: Deployment Verification
- Verified Netlify deployment
- Confirmed custom domain with SSL

### Session - December 2, 2025: Full Deployment
- Created Netlify site, configured env vars
- Set up custom domain: bloom.wunderkind.world

### Session - November 30, 2025: Project Setup
- Created GitHub repo, initialized Next.js
- Created Supabase project and initial schema

---

## Next Steps

1. **Chat History Persistence** - Save conversations to database

2. **Generate context_index** - Auto-generate from content_items

3. **More Children** - Import Amelia, other case files

4. **AI-Guided Interviews** - Structured interview flow with AI

5. **Progress Tracking** - Track improvements over time
