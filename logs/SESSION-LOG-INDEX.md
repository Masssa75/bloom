# Bloom Session Log Index

This index provides a comprehensive overview of all Bloom development sessions. For detailed session logs, see the individual log files.

## 2025

### December 2025 Sessions

#### [Session 2 - December 19, 2025 - Discovery Interview Mode](SESSION-LOG-2025-12.md#session-2---december-19-2025-discovery-interview-mode)
- **Unified interview design**: Same process works for children with/without behavioral concerns
- **AI-guided discovery interviews** for new children without case files
- **Auto-mode detection**: Programmatic (server-side), not AI detection
- **Interview documents** persist transcript with timestamps, support resumption
- **close_interview tool** generates summary and key traits

#### [Session 1 - December 19, 2025 - Context Caching & Bug Fixes](SESSION-LOG-2025-12.md#session-1---december-19-2025-context-caching--bug-fixes)
- **Moonshot context caching** implemented for up to 90% token savings on long conversations
- **chat_sessions table** created for persistent conversation history with tool results
- **Tool call badges** now show document titles (`document: Quick Reference Guide ✓`)
- **Bug fixes:** Component tag parsing regex, Netlify timeout (10s→60s), stream blocking
- **Playwright test** created for chat flow (`tests/chat-test.spec.ts`)
- **Test account** added as collaborator on Michael's profile

#### [Session 0 - December 18, 2025 - MVP & AI Chat](SESSION-LOG-2025-12.md#session-0---december-18-2025-mvp--ai-chat)
- **Complete MVP** built: Auth, Dashboard, Child Profiles, Incident Reporting, Document Viewer
- **AI Chat** with Kimi K2 (Moonshot) - tool calling for case file access
- **Component toolkit:** `<urgent>`, `<script>`, `<later>`, `<insight>`, `<note>`
- **Collaborator invites** - invite others by email, auto-accept on signup
- **Document organization** - collapsible categories, weight-based sorting
- **Playwright tests** for add-child and invite flows

---

### November 2025 Sessions

#### [November 30, 2025 - Project Setup](SESSION-LOG-2025-11.md#november-30-2025-project-setup)
- **Initial project setup:** GitHub repo, Next.js, Supabase, Netlify
- **Database schema** designed for children, content_items, collaborators

---

**Note**: Session logs moved to `logs/` folder for better organization. See individual log files for full details.
