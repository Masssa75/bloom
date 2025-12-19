---
description: Run the AI-Dev collaborative workflow for improving Bloom's AI responses
---

# AI-Dev Workflow

You are starting the **AI-Dev collaborative development workflow**.

## First: Read the current state

Read `.claude/skills/ai-dev/dev-log.md` to understand:
- Current scores for each area
- What's in the improvement backlog
- What was tried in previous sessions

## Then: Present options to the user

Based on the dev-log, offer the user choices:

1. **Work on backlog item** - Pick an improvement to implement
2. **Establish new baseline** - Test an area that hasn't been scored yet
3. **Re-test after changes** - Verify a recent improvement worked
4. **Add new scenario** - Create a scenario for an untested situation

**Wait for user to pick before proceeding.**

## Workflow reminder

```
1. Propose → User picks
2. Write scenario → User approves
3. Run & evaluate
4. Suggest improvements → User picks
5. Implement approved changes
6. Verify & update dev-log
```

Always update `dev-log.md` and the relevant `areas/*.md` file with results.
