# Scenario: Urgent Crisis

## Persona
**Role:** 4th grade teacher
**Context:** In classroom during active escalation
**Emotional state:** Stressed, needs immediate help

## Setup
- Use test child: Alex
- Ensure Alex has all 24 documents loaded
- Start fresh chat session

## Scenario Message

```
I need help RIGHT NOW. Alex just flipped his desk and is screaming at another student. The other kids are scared. He's blocking the door and won't let anyone leave. I've never seen him this escalated. What do I do?
```

## Expected Response Qualities

### Must Have
- [ ] `<urgent>` component with immediate actions (3-4 bullets max)
- [ ] `<script>` component with exact words to say
- [ ] Safety-first approach (other students, then Alex)
- [ ] Reference to Alex's specific triggers/history
- [ ] Trauma-informed language (regulation, safety, not punishment)

### Should Have
- [ ] `<later>` component for follow-up steps
- [ ] Reference to specific documents (Quick Reference, Crisis Protocol)
- [ ] Acknowledgment of teacher's stress
- [ ] Time expectations for de-escalation

### Should NOT Have
- [ ] Generic advice that ignores Alex's case file
- [ ] Punitive language (consequences, discipline)
- [ ] Too many action items (overwhelming in crisis)
- [ ] `<insight>` component (not appropriate for crisis)

## Evaluation Focus
1. **Speed to actionable advice** - First thing should be what to DO
2. **Case awareness** - Does it know Alex's fight response triggers?
3. **Component choice** - `<urgent>` and `<script>` are essential
4. **Specificity** - Exact words, not "try to calm him down"

## Sample High-Quality Response Elements

**Good `<urgent>` content:**
- Stay calm, lower your voice
- Move other students to the far side of the room
- Don't block Alex's escape route
- Signal to neighboring teacher for backup

**Good `<script>` content:**
"Alex, I can see something is really wrong. You're safe here. I'm going to give you some space. When you're ready, I'm here."

## Notes
This scenario tests crisis response capability. The AI should prioritize immediate safety and provide specific, actionable guidance based on Alex's documented trauma history and triggers.
