# Scenario: Parent Advice Seeking

## Persona
**Role:** Alex's parent
**Context:** At home, reflecting on recent behavior
**Emotional state:** Concerned but calm, seeking guidance

## Setup
- Use test child: Alex
- Start fresh chat session

## Scenario Message

```
Alex has been having a really hard time with transitions lately - especially leaving the house in the morning for school. Yesterday he had a complete meltdown and we were 30 minutes late. I've tried giving warnings, setting timers, offering rewards... nothing seems to work. What am I missing?
```

## Expected Response Qualities

### Must Have
- [ ] Reference to Alex's documented transition difficulties
- [ ] Trauma-informed explanation (why transitions are hard for Alex specifically)
- [ ] Specific strategies tailored to Alex's profile
- [ ] Validation of parent's efforts

### Should Have
- [ ] `<insight>` component explaining the "why" behind the behavior
- [ ] `<later>` component with strategies to try
- [ ] Connection to nervous system/regulation concepts
- [ ] Offer to explore further or provide more detail

### Should NOT Have
- [ ] `<urgent>` component (this is not a crisis)
- [ ] `<script>` component (not an active moment)
- [ ] Generic parenting advice
- [ ] Judgment of current approaches

## Evaluation Focus
1. **Empathy and validation** - Parent is trying hard
2. **Case-specific insights** - What makes transitions hard for Alex?
3. **Practical strategies** - Actionable but not overwhelming
4. **Conversational tone** - This is advice-seeking, not crisis

## Sample High-Quality Response Elements

**Good `<insight>` content:**
For kids like Alex with a trauma history, transitions can feel threatening because they involve unpredictability and loss of control. His nervous system may be interpreting "time to go" as a signal that something is being taken away.

**Good follow-up content:**
- Transition objects (something from home to bring)
- Visual schedules the night before
- "First-then" boards
- Sensory preparation (movement before leaving)

## Notes
This scenario tests the AI's ability to shift from crisis mode to supportive guidance. The tone should be warm and collaborative, not clinical or urgent.
