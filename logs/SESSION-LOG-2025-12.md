# Bloom Session Log - December 2025

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
