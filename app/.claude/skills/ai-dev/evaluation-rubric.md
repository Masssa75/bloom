# Evaluation Rubric

Use this rubric to score AI responses during scenario testing.

## Overall Score (1-10)

| Score | Description |
|-------|-------------|
| 9-10 | Excellent - Could be used as training example |
| 7-8 | Good - Minor improvements possible |
| 5-6 | Adequate - Gets the job done but missing key elements |
| 3-4 | Poor - Significant issues with content or presentation |
| 1-2 | Failed - Wrong approach, harmful, or unusable |

---

## Dimension 1: Content Accuracy (1-10)

**What to evaluate:**
- Is the information correct?
- Does it align with trauma-informed best practices?
- Are strategies appropriate for the child's profile?
- No harmful or counterproductive advice?

| Score | Criteria |
|-------|----------|
| 10 | Flawless, evidence-based, perfectly tailored |
| 8 | Accurate with minor omissions |
| 6 | Mostly accurate, some generic advice |
| 4 | Contains inaccuracies or inappropriate suggestions |
| 2 | Significantly wrong or potentially harmful |

---

## Dimension 2: Case Awareness (1-10)

**What to evaluate:**
- Did it reference the child's specific documents?
- Does it mention specific triggers, history, or patterns?
- Is advice tailored to THIS child vs. generic?
- Did it fetch appropriate documents?

| Score | Criteria |
|-------|----------|
| 10 | Deep integration of case file, specific references |
| 8 | Good use of case context, mentions specifics |
| 6 | Some case awareness but mostly general |
| 4 | Minimal case reference, generic advice |
| 2 | Ignored case file entirely |

---

## Dimension 3: Component Usage (Appropriate/Inappropriate)

**Check each component:**

| Component | When Appropriate | When NOT Appropriate |
|-----------|------------------|----------------------|
| `<urgent>` | Active crisis, immediate safety concern | Reflective questions, advice-seeking |
| `<script>` | In-the-moment guidance, exact words needed | Analysis, explanation, planning |
| `<later>` | Follow-up steps, when-calm actions | Nothing (always useful if relevant) |
| `<insight>` | Key takeaway, "aha" moment, explanation | Active crisis (action needed, not insight) |
| `<note>` | Brief context, aside, caveat | Nothing (flexible use) |

**Score as:**
- **Appropriate**: Right components for the context
- **Partially Appropriate**: Some good choices, some questionable
- **Inappropriate**: Wrong components that hurt the response

---

## Dimension 4: Trauma-Informed Approach (Yes/No + Notes)

**Checklist:**
- [ ] Safety-first framing
- [ ] Regulation language (nervous system, co-regulation)
- [ ] No punitive or consequence-focused advice
- [ ] Acknowledges underlying needs behind behavior
- [ ] Empowers the adult (not prescriptive commands)
- [ ] Validates emotions and efforts

**Score as:** Yes / Partial / No

**Notes field:** What was good or missing?

---

## Dimension 5: Actionability (1-10)

**What to evaluate:**
- Can the person actually DO what's suggested?
- Is it specific enough to implement?
- Right level of detail (not overwhelming, not vague)?
- Prioritized appropriately (most important first)?

| Score | Criteria |
|-------|----------|
| 10 | Immediately actionable, clear priorities |
| 8 | Actionable with minor clarification needed |
| 6 | Somewhat actionable but vague in places |
| 4 | Hard to implement, too general |
| 2 | Not actionable, purely theoretical |

---

## Quick Scoring Template

Copy this for each scenario run:

```
## Scenario: [Name]
**Date:** YYYY-MM-DD
**Tester:** [Name]

### Scores
- **Overall:** X/10
- **Content Accuracy:** X/10
- **Case Awareness:** X/10
- **Component Usage:** Appropriate / Partial / Inappropriate
- **Trauma-Informed:** Yes / Partial / No
- **Actionability:** X/10

### Components Used
- [ ] urgent
- [ ] script
- [ ] later
- [ ] insight
- [ ] note

### What Worked Well
-

### What Needs Improvement
-

### Suggested Changes
-
```
