# Working Style & Collaboration Preferences (anjit-afk)

How the owner of this project likes to work. Follow this in every session.

## Communication / output
- The owner is **non-technical** ("far from the development world") but engages deeply
  with architecture and trade-offs and asks sharp, probing questions.
- Explain in **plain English with analogies**; avoid jargon. When technical detail is
  needed, pair it with a plain-language summary.
- Prefer **structured output**: milestone breakdowns, tables, checkboxes, clear "what/why".
- Be **honest about risks, limitations, and any deviation** from the agreed plan — flag
  deviations explicitly rather than hiding them.
- **Guide, don't just list options** — give a clear recommendation and a suggested next step.

## Process (how they instruct)
- **Contract-first.** Before writing code, produce a complete implementation document:
  architecture review, milestones, risks, "what could go wrong / be misunderstood" lists,
  test checklists, and limitations. Build only after agreement.
- **Very small, independently testable milestones**, each on its **own branch + PR**.
  They use "Option A": test each PR, then merge it. Keep separate commits so a regression
  isolates to one step.
- **Rigorous self-review** (review → fix → review) and a **build check** before handoff.
- **Only stop for genuine manual testing** (browser behavior, multi-device/multi-tab, real
  interaction). When told to keep going, implement multiple milestones without pausing as
  long as changes are small and data-safe; batch the manual test at a natural point.
- **Don't ask for a full feature-regression every time** — only when a change is broad
  enough to warrant it. Otherwise give a **focused, task-style checklist**.

## Non-negotiable priorities
- **Zero data loss / never break existing features** is the top priority, above speed.
  Surface all risks beforehand.
- **Never disturb the persistence/sync layer** except in explicitly-scoped, non-destructive
  steps (keep old data as a backup; never delete on migration).

## Environment
- **Kiro Web** (browser); the owner has no IDE/filesystem access — surface file contents
  and push branches/PRs so they can review on **GitHub**.
- They deploy via **Vercel** (per-branch previews) and use **HashRouter**-style links.
- They test against a **separate repo + separate Firebase project** (safe dev sandbox), so
  dev/test mistakes there are acceptable — but the code must still be production-safe.
