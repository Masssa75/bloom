# Bloom - AI-Powered Child Behavioral Assessment Platform

<!-- ============================================================
     PROTECTED SECTIONS - READ THIS BEFORE EDITING
     ============================================================

     TIER 1: NEVER EDIT OR REMOVE (Core Processes)
     These sections define how we work. Do not modify without explicit permission.
     - Autonomous Development Workflow
     - Communication Style
     - The Sunbeam Debugging Protocol
     - Autonomous Working Principles
     - Development Rules
     - Session Management

     TIER 2: CAN EDIT, DO NOT REMOVE WITHOUT PERMISSION (Evolving Reference)
     These sections may be updated as the project evolves, but should not be
     deleted without asking first.
     - Project Overview
     - Tech Stack
     - Quick Start
     - Database Schema
     - App Structure
     - Test Account
     - Useful Scripts
     - Key Implementation Details
     - Project Info
     - Session Logs

     DYNAMIC: UPDATE FREELY
     These sections are expected to change frequently.
     - Current State (What's Built / Not Built)
     - Next Steps

     ============================================================ -->

## Project Overview

**Bloom** is an AI-powered platform for understanding and supporting children's behavioral development. It enables parents, teachers, and caregivers to:
- Store and organize behavioral case files and assessments
- Report and track behavioral incidents
- Collaborate with multiple caregivers on a child's profile
- Get AI-powered guidance using case context (Kimi K2 integration)

**Live URL:** https://bloom.wunderkind.world
**GitHub:** https://github.com/Masssa75/bloom-app

## Current State (December 19, 2025)

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
- **Discovery Interviews**: AI-guided interviews for new children
  - Auto-detects interview mode vs case support mode
  - Persistent transcript document with timestamps
  - AI suggests closing when enough info gathered
  - `close_interview` tool generates summary and key traits
- **Chat History UI**: View and load past chat sessions
  - History panel with session previews
  - Tool badges showing which docs were fetched
  - Collaborators see all sessions for shared children
- **Scenario Testing**: Framework for testing AI responses
  - Test child "Alex" (duplicate of Michael) for safe experimentation
  - Scenario runner script for automated testing
- **Playwright Tests**: E2E tests for add-child, invite, and chat flows

### What's NOT Built Yet ❌
- Framework analysis generation
- Progress tracking over time
- Action panel sidebar (AI-managed suggested next steps)

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
- **Alex's child_id:** `6e702a66-e366-4bb7-8eae-e62cae2b13a0` (test duplicate of Michael for scenario testing)

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

### Chat History API

```
GET  /api/chat/history?childId=xxx    # List sessions for a child
POST /api/chat/history                # Load full session by ID
     Body: { "sessionId": "xxx" }
```

**Returns (GET):**
- `sessions[]`: Array with `id`, `createdAt`, `updatedAt`, `preview`, `messageCount`, `toolsUsed[]`

**Access Control:** Uses service client to bypass RLS so collaborators see all sessions for shared children.

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

#### Wrap Protocol
When the user says **"WRAP"** or "wrap this session", perform end-of-session cleanup:

1. **Determine Session Number:**
   - Read `/logs/SESSION-LOG-INDEX.md` to find the current session count
   - This session will be: (current count + 1)
   - Example: If "Total Sessions: 3", this session is Session 4

2. **Create/Update Session Log:**
   - File: `/logs/SESSION-LOG-YYYY-MM.md` (e.g., `SESSION-LOG-2025-12.md`)
   - Add entry as: `## Session N - December 19, 2025: Title` (where N is the session number)
   - Include: Summary, changes made, decisions, next steps

3. **Update Session Index:**
   - File: `/logs/SESSION-LOG-INDEX.md`
   - Add entry with session number, date, and brief summary
   - Increment "Total Sessions" count (if tracked)
   - Update "Latest Session" reference

4. **Inform User of Session Number:**
   - After wrapping, tell the user: "Session N wrapped successfully" (where N is the session number)
   - This helps the user track which session they just completed

5. **Update CLAUDE.md:**
   - Update "Current State" section with new features
   - Move detailed work to session logs
   - Keep only essential current state info

6. **Mark Todos as Complete:**
   - Update todo statuses for completed work

7. **Commit and Push:**
   - Commit all changes with descriptive message
   - Push to remote repository

8. **Suggest CLAUDE.md Additions:**
   - Review the session for important additions future instances should know about
   - Only suggest long-term, foundational system information (not session-specific details)
   - Good additions: new API endpoints, architectural patterns, test data IDs, critical workflows
   - Skip: temporary scripts, one-time fixes, experimental features
   - Present suggestions to user for approval before adding

#### Mid-Task WRAP
If wrapping during incomplete work:
- Keep incomplete todos as "pending" or "in_progress"
- Add "Next Session Notes" section to session log
- Document: current progress, next steps, important context
- List files partially modified and tests still needed

#### Session Logging Guidelines
- Keep CLAUDE.md focused on current state and essential documentation
- Move completed work details to dated session logs
- Session logs preserve full history while keeping main doc clean

#### Other Session Rules
- **File deprecation**: Mark old files immediately when creating new versions with reason
- **Incomplete work**: Document current state and next steps in session logs

### Communication Style
- Ask for clarification when requirements are ambiguous
- Provide options and recommendations before implementing
- Explain technical decisions and trade-offs
- Keep responses concise but informative

---

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
- Update session logs immediately
- Note what was broken and why
- Document the fix approach
- Update test documentation

---

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

---

## Development Rules

### Critical Rules (NEVER BREAK THESE):
1. **Never create fallback systems** without explicit request
2. **Always create backup** before major changes
3. **Do only what's asked** - nothing more, nothing less
4. **Never create files** unless absolutely necessary
5. **Always prefer editing** existing files to creating new ones
6. **API keys go in .env file** - never in code or CLAUDE.md
7. **Never proactively create documentation files** unless requested

### Repository Security (NEVER BREAK THESE):
1. **CLAUDE.md stays local** - must be in root (outside app/), never pushed to GitHub
2. **logs/ stays local** - session logs contain project context, never push
3. **.env files stay local** - in root, symlinked to app/ for runtime
4. **Only app/ folder is the git repo** - everything in root is local-only
5. **Verify .gitignore** before first commit on any new project

### Project Structure (Security Pattern):
```
bloom/                    # LOCAL ONLY - not a git repo
├── CLAUDE.md            # Project context (local only)
├── logs/                # Session logs (local only)
├── .env.local           # Secrets (local only)
├── design-mockups.html  # Local design reference
└── app/                 # GIT REPO - pushed to GitHub
    ├── .git/
    ├── src/
    ├── public/
    ├── package.json
    ├── .gitignore
    ├── .env.local -> ../.env.local  # Symlink to root
    └── ...
```

### File Management:
- Mark deprecated files immediately in session logs
- Use git branches for major changes
- Keep todo list updated in real-time
- Document file purposes clearly

### Testing Approach:
- Always verify in browser first
- Create automated tests for critical paths
- Test edge cases and error states
- Document test scenarios

### Scenario Testing Protocol
For testing AI chat responses, use the **scenario-testing** skill:
- Location: `app/.claude/skills/scenario-testing/`
- Invoke by saying: "Let's run scenario testing" or "Test AI responses"
- Includes: personas, scenarios, evaluation rubric, improvement tracking
- Test child: Alex (safe duplicate of Michael for experimentation)

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

2. **Action Panel Sidebar** - Persistent AI-managed panel with suggested next actions (not inline in chat)

3. **Generate context_index** - Auto-generate from content_items after interview closes

4. **Framework Research after Interview** - AI searches for frameworks matching child profile

5. **Progress Tracking** - Track improvements over time

6. **Incident Reporting via Chat** - Natural conversation to log incidents
