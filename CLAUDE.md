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
- **AI Chat**: Kimi K2 (Moonshot) with tool calling for case file access
  - Component toolkit: `<urgent>`, `<script>`, `<later>`, `<insight>`, `<note>`
  - Markdown rendering (lists, bold) in plain text
  - Incomplete response detection with retry button
  - Auto-expanding input, tool call badges
- **Playwright Tests**: E2E tests for add-child and invite flows

### What's NOT Built Yet ❌
- AI-guided interviews
- Framework analysis generation
- Progress tracking over time
- Chat history UI (sessions persist in DB, but no UI to view past chats)

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

-- Chat Sessions (for context caching)
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',  -- Full conversation with tool results
  cache_id TEXT,                          -- Moonshot cache ID
  cache_expires_at TIMESTAMPTZ,           -- When cache expires
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
│   │   ├── chat/page.tsx                 # AI chat page
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
│   │   ├── ChatPage.tsx                  # Full-page chat with action cards
│   │   ├── CollaboratorsSection.tsx      # Invite & manage collaborators
│   │   ├── DocumentCategories.tsx        # Collapsible doc categories
│   │   └── PendingInvitations.tsx        # Accept/decline invites
│   ├── lib/
│   │   ├── chat/
│   │   │   └── components.ts             # AI response component toolkit config
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

**Test Data:**
- **Michael's child_id:** `c8b85995-d7d7-4380-8697-d0045aa58b8b`

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

### AI Chat Integration (Kimi K2 via Moonshot)

The chat feature uses Kimi K2 with tool calling to access case files:

**Architecture:**
1. User sends message via `/chat` page
2. `/api/chat` calls Kimi K2 (Moonshot) with tool definitions
3. Kimi decides which documents to fetch
4. Tool calls executed against Supabase
5. Kimi synthesizes response with case context
6. Streaming response displayed with action cards

**Available Tools:**
- `get_child_overview` - Returns child profile + document list
- `get_document` - Fetches full content of specific document
- `web_search` - Search web for behavioral strategies (Moonshot built-in)

**AI Response Component Toolkit:**

The AI has HTML-like components it can use to format responses. Defined in `/src/lib/chat/components.ts`:

| Component | Renders As | Usage |
|-----------|------------|-------|
| `<urgent>` | Red card | Immediate actions (max 3-4 bullets) |
| `<script>` | Blue card | Exact words to say verbatim |
| `<later title="X">` | Collapsible | Follow-up steps when calm |
| `<insight>` | Green card | Key takeaway for informational responses |
| `<note>` | Gray aside | Brief context or explanation |

Plain text supports markdown: `**bold**` and bullet lists (`- item`).

The AI decides which components to use based on context. For conversational questions, it uses plain text.

**To add a new component:**
1. Add to `COMPONENTS` array in `/src/lib/chat/components.ts`
2. Add renderer case in `ChatPage.tsx` `ComponentRenderer` switch
3. Prompt and parser update automatically

**Provider Notes:**
- **Moonshot (current)**: Reliable tool calling, has web search, slower
- **Groq (disabled)**: 40x faster but unreliable tool calling - re-enable when fixed

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

### Session Management
- **WRAP keyword**: End session with cleanup:
  1. Update session logs in `logs/` folder with what was accomplished
  2. Document progress and mark todos complete
  3. Commit and push all changes
- **File deprecation**: Mark old files immediately when creating new versions with reason
- **Incomplete work**: Document current state and next steps in session logs

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

## Session Logs

**All session accomplishments are in the `logs/` folder for better organization.**

See:
- `logs/SESSION-LOG-INDEX.md` - Overview of all sessions
- `logs/SESSION-LOG-2025-12.md` - December 2025 sessions

---

## Next Steps

1. **Re-enable Groq when tool calling improves** - Groq is 40x faster than Moonshot but currently has unreliable tool calling. Monitor their updates and re-add as an option when fixed.

2. **Chat History Persistence** - Save conversations to database

3. **Generate context_index** - Auto-generate from content_items

4. **More Children** - Import Amelia, other case files

5. **AI-Guided Interviews** - Structured interview flow with AI

6. **Progress Tracking** - Track improvements over time

7. **Incident Reporting via Chat** - Natural conversation to log incidents
