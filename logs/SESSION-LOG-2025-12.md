# Bloom Session Log - December 2025

## Session 5 - December 19, 2025: Scenario Testing & Chat History UI

### Overview
Set up scenario-based testing framework for evaluating AI responses. Created test child "Alex" (duplicate of Michael). Implemented chat history UI so users can view past conversations. Fixed Playwright tests for updated app behavior.

### Completed

**Scenario Testing Framework:**
- Created "Alex" as test child (duplicate of Michael with all 24 documents)
- Built scenario runner script (`scripts/run-scenario.ts`)
- Ran "Urgent Crisis" scenario - teacher with escalating student
- AI response scored 8/10: used all components (`<urgent>`, `<script>`, `<later>`, `<insight>`, `<note>`), trauma-informed, case-aware

**Chat History UI:**
- Added history button (clock icon) in chat header
- Slide-out panel showing past sessions with:
  - Preview of first message
  - Tool badges showing which docs were fetched
  - Date and message count
  - "New Chat" button
- Load any past session to view full conversation
- Fixed RLS issue so collaborators can see all sessions for shared children

**Playwright Test Fixes:**
- Updated `add-child.spec.ts` - expects `/chat` redirect after login
- Updated `invite.spec.ts` - creates test child to ensure ownership
- Updated `chat.spec.ts` - removed Groq toggle tests (Groq disabled)
- All 7 tests now passing

**Tool Call Tracking:**
- Tool calls now saved with session messages
- Displayed as badges in history list
- Extracted and shown when loading past sessions

### Analysis: Urgent Crisis Response

The AI's crisis response demonstrated:
- ✅ Immediate actions in `<urgent>` (3 bullets)
- ✅ Exact script in `<script>` component
- ✅ Follow-up steps in collapsible `<later>`
- ✅ Case-aware insight (transitions trigger Alex's fight response)
- ✅ Trauma-informed approach (nervous system, safety-first)

**Identified Improvements:**
1. Could cite specific documents ("See Quick Reference for more...")
2. Missing "Don't Do" list for crisis moments
3. No time expectations for de-escalation
4. Action panel for suggested next steps (in progress)

### Next Steps
- **Action Panel Sidebar**: Persistent panel with AI-managed suggested actions
- **System Prompt Improvements**: Cite docs, don't-do lists, time expectations
- **More Scenarios**: Test other personas (parent advice-seeking, pattern questions)

### Files Changed
- `src/components/ChatPage.tsx` - History panel, tool call display
- `src/app/api/chat/history/route.ts` - New API for chat history
- `tests/add-child.spec.ts` - Fixed redirect expectation
- `tests/invite.spec.ts` - Fixed ownership issue
- `tests/chat.spec.ts` - Removed Groq tests
- `scripts/duplicate-child.ts` - Create test children
- `scripts/run-scenario.ts` - Scenario runner

---

## Session 4 - December 19, 2025: Repository Security & Project Restructure

### Overview
Major restructure to separate local-only files from deployable code. Implemented security pattern where CLAUDE.md, logs/, and .env files stay local (never pushed to GitHub), while app/ folder is the git repository.

### Completed

**Repository Restructure:**
- Created `app/` subfolder for all deployable code
- Moved src/, public/, package.json, configs, tests, scripts to app/
- Root folder now contains only local files: CLAUDE.md, logs/, .env.local, design-mockups.html
- Created symlink: `app/.env.local` → `../.env.local`

**New GitHub Repository:**
- Created fresh repo: https://github.com/Masssa75/bloom-app (private)
- Old repo (github.com/Masssa75/bloom) kept as backup with full history
- Clean git history without sensitive CLAUDE.md content

**Security Rules Added to CLAUDE.md:**
- Repository Security section (5 rules)
- Project Structure diagram showing local vs git-tracked files
- Added to Tier 1 protected sections

**CLAUDE.md Improvements:**
- Added two-tier protection manifest (Tier 1: never edit, Tier 2: can edit/don't remove)
- Added missing workflow sections from bamboovalley:
  - Communication Style
  - The Sunbeam Debugging Protocol (5 steps)
  - Autonomous Working Principles (Do/Ask/Judgment lists)
  - Development Rules (7 critical rules)
- Updated wrap protocol with detailed steps

**Deployment:**
- Connected new repo to Netlify
- Build and deploy successful to bloom.wunderkind.world

### Project Structure (New)
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
    └── ...
```

### Files Changed
- `CLAUDE.md` - Added protection manifest, security rules, workflow sections
- `app/*` - All deployable code now in subfolder
- `logs/SESSION-LOG-INDEX.md` - Session tracking
- New repo: github.com/Masssa75/bloom-app

### Next Session Notes
- Run Playwright tests to verify restructure (shell was broken this session)
- Remove old .git folder from root once confirmed working

---

## Session 3 - December 19, 2025: Interview Design & Transcript Persistence

### Overview
Discussed and refined the discovery interview design. Key insight: same interview process works for children with behavioral concerns AND children without issues. Implemented interview transcript persistence and closing mechanism.

### Design Decisions

**Unified Interview Approach:**
The key insight was that the same interview process works for both:
- Children with behavioral concerns (like Michael) - problems surface naturally
- Children without issues (like Ofelia) - becomes a discovery of personality/strengths

Opening question: "Tell me about [child]. Start wherever feels important to you."
- If parent leads with concerns → AI follows that thread with ABC pattern
- If parent describes personality → AI asks for specific examples

**One Process, Different Outcomes:**
- No need to ask "is there a problem?" - the parent's lead reveals it
- Same interview phases: Open Narrative → Go Deeper → Round Out → Clarify
- AI gathers data without interpreting during the interview
- Analysis and framework research happens after interview closes

**Programmatic Mode Detection (not AI detection):**
- Mode determined server-side before AI call (simpler, more reliable)
- Two separate focused prompts: `buildInterviewPrompt()` and `buildCaseSupportPrompt()`
- Interview mode only gets interview tools; case support gets document tools

### Completed

**Interview Transcript Persistence:**
- Creates `interview` type documents to persist conversation transcript
- Real-time transcript updates with timestamps
- Interview resumption: loads previous transcript when returning

**Interview Closing Mechanism:**
- `close_interview` tool lets AI wrap up and generate summary
- AI suggests closing after exploring 4-5 areas
- Generates: summary, one-liner, key traits, suggested frameworks
- Status changes from `open` to `closed`

**Interview Document Schema:**
- Type: `interview`, Subtype: `discovery`
- Weight: 5 (essential)
- Status: `open` (in progress) or `closed` (complete)
- Full transcript saved with timestamps

### Files Changed
- `src/app/api/chat/route.ts` - Transcript persistence, close_interview tool, mode detection refactor

---

## Session 2 - December 19, 2025: Discovery Interview Mode

### Overview
Implemented AI-guided discovery interviews for new children who don't have case files yet. The system now auto-detects whether to run in interview mode or case support mode.

### Completed

**Discovery Interview System:**
- AI conducts natural discovery interviews for new children
- Auto-mode detection based on document count

**Auto-Mode Detection:**
- **Interview Mode**: Activated when child has no case files, or has an open interview
- **Case Support Mode**: Activated when child has existing case files (no open interview)
- Seamless mode switching after interview closes

**Interview Flow:**
1. User adds new child (no documents)
2. Chat opens → detects no case files → starts discovery interview
3. AI asks warm, open-ended questions following user's lead
4. AI explores temperament, emotions, relationships, interests, strengths, edges
5. When enough info gathered, AI offers to wrap up
6. Child now has documents → future chats use case support mode

### Files Changed
- `src/app/api/chat/route.ts` - Interview mode logic, initial implementation

---

## Session 1 - December 19, 2025: Context Caching & Bug Fixes

### Overview
Implemented Moonshot context caching to dramatically reduce token costs for long conversations, fixed critical bugs that were causing chat responses to fail, and added developer-friendly debugging tools.

### Completed

**Context Caching System:**
- Created `chat_sessions` table in Supabase to persist full conversation history
- Full messages stored in JSONB (including tool calls and tool results)
- After each response, creates Moonshot cache with complete context
- Subsequent messages use `cache_id` instead of resending everything
- Up to 90% token savings on multi-turn conversations
- Cache TTL: 1 hour, auto-refreshed on each use

**API Changes:**
- `/api/chat` now accepts single `message` + `sessionId` (not full messages array)
- Returns `sessionId` on first message for subsequent requests
- Added `maxDuration = 60` to extend Netlify function timeout from 10s → 60s

**Frontend Changes:**
- `ChatPage.tsx` tracks `sessionId` in state
- Session resets when switching children
- Retry resets session (starts fresh conversation)
- Console logging for debugging: `📝 New session`, `⚡ USING CACHE`, `🔄 No cache`, `✅ Stream completed`

**Bug Fixes:**
- Fixed component tag parsing regex (double-escape `[\\s\\S]` in template strings)
- Fixed `done` event timing - now sent before cache operations so client isn't blocked
- Added error handling for cache creation failures (graceful degradation)
- Extended Netlify function timeout - **this was the root cause of chat failures**

**UX Improvements:**
- Tool call badges now show document titles: `document: Quick Reference Guide ✓`
- Child overview badge shows child name: `child overview: Michael ✓`
- Hover tooltip shows full title for truncated names (30+ chars)

**Testing:**
- Created Playwright test for chat flow (`tests/chat-test.spec.ts`)
- Added test account (`claude-test@bloom.wunderkind.world`) as collaborator on Michael's profile
- Tests passing with ~34s response time

### Key Technical Details

**How Caching Works:**
1. First message: Full context sent → response processed → cache created
2. Second+ messages: Only `cache_id` + new message sent (massive token savings)
3. Cache includes: system prompt, tool definitions, all messages, all tool results

**Critical Fix - Netlify Timeout:**
```typescript
// src/app/api/chat/route.ts
export const maxDuration = 60 // seconds (default was 10s!)
```

**Moonshot Caching API:**
- Uses `api.moonshot.cn/v1/caching` (different from chat at `.ai`)
- Cache message format: `role: 'cache'`, `content: 'cache_id=xxx;reset_ttl=3600'`

### Files Changed
- `src/app/api/chat/route.ts` - Session persistence, caching, timeout config
- `src/components/ChatPage.tsx` - Session tracking, console logging, detail badges
- `supabase/migrations/20251218120000_chat_sessions.sql` - New table
- `tests/chat-test.spec.ts` - New Playwright test
- `scripts/add-test-collaborator.ts` - Utility script

---

## Session 0 - December 18, 2025: MVP & AI Chat

### Overview
Built the complete Bloom MVP including authentication, dashboard, child profiles, incident reporting, document viewer, AI chat with Kimi K2, and collaborator invites.

### Completed

**Core MVP Features:**
- Login/signup with email confirmation (Supabase Auth)
- Dashboard listing children with quick actions
- Child profiles with case files organized by category
- Add child form
- Incident reporting with severity, context, response fields
- Document viewer for HTML/markdown case files

**AI Chat System:**
- Kimi K2 (Moonshot) integration with tool calling
- Tools: `get_child_overview`, `get_document`, `web_search`
- AI fetches relevant case files to answer questions
- Streaming responses with tool call status badges

**Component Toolkit:**
- `<urgent>` - Red card for immediate actions
- `<script>` - Blue card for exact words to say
- `<later>` - Collapsible for follow-up steps
- `<insight>` - Green card for key takeaways
- `<note>` - Gray aside for context
- AI decides which components to use based on context

**Collaboration Features:**
- Invite collaborators by email
- Auto-accept pending invitations on signup
- `invitations` table for pending invites
- `CollaboratorsSection` component on child profile
- `PendingInvitations` component on dashboard

**Document Organization:**
- Collapsible categories by document subtype
- Weight-based sorting (5=essential, 1=archival)
- Star indicator for weight-5 documents

**Testing:**
- Playwright tests for add-child flow
- Playwright tests for invite flow
- Test account: `claude-test@bloom.wunderkind.world`

### Database Schema Created
- `profiles` - User profiles extending Supabase auth
- `children` - Child records with context_index
- `collaborators` - Who can access which child
- `invitations` - Pending invites for non-users
- `content_items` - Documents, incidents, sessions

### Files Created
- Complete Next.js 16 app structure
- 24 case files imported for Michael
- API routes for chat, invites, Kimi document access

---

## November 2025 Sessions

### November 30, 2025: Project Setup

**Initial Setup:**
- Created GitHub repository (https://github.com/Masssa75/bloom)
- Initialized Next.js project with TypeScript + Tailwind
- Created Supabase project (aloekdzacexftdpewxrd)
- Set up Netlify deployment (bloom.wunderkind.world)
- Designed initial database schema

---

*For session details before November 2025, see project history in git commits.*
