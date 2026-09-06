# Bug Report #2 — Canvas / Cards, Clones, Reminder-Sync & Validation

**Scope:** This is a *fresh, independent* code-level review, separate from the
first report (`multi-tab-sync-bugs`). That report covered only multi-tab
detection and cross-device version/conflict sync. **This report covers a
different area:** how cards (nodes) are created and identified, how clones
behave, how reminder timing data leaks into synced storage, and gaps in the
data-integrity validator.

**Why this exists:** a user observed that creating a new card sometimes makes an
existing card jump onto the screen, "attach" to the new card (one above the
other), keep its old connections, and become impossible to delete. That exact
symptom is **Bug C1** below, and the review found several related defects.

**How to read each entry**
- **What you would see** — the symptom in plain words.
- **Exact scenario** — a reproducible story.
- **Where it is** — file + function/lines.
- **Why it happens** — root cause.
- **Correct behaviour** — what it should do.
- **Severity** — 🔴 Critical (data loss / unusable data) · 🟠 High (wrong data / churn) · 🟡 Medium (edge case / hygiene).

**30-second summary**
> Card IDs are handed out from a single counter (`nextId`) that is stored in the
> **project metadata** — a *different* document from the one that stores the
> cards. Nothing ever checks that `nextId` is actually higher than the IDs
> already in use. When that counter falls behind (missing value, a `|| 1`
> fallback, or the metadata being reverted by the known sync bugs), the next card
> is born with an **ID that already belongs to another card**. Because a card's
> ID drives its connections, its on-screen identity, and its deletion, a
> duplicate ID makes two cards merge/stack, share connections, and resist
> deletion. Separately, deleting a card orphans its clones in other workspaces,
> and the reminder engine keeps writing throwaway timing values into synced
> metadata, causing constant needless cloud writes.

---

## 🔴 Bug C1 — New card can be born with an ID that already exists (duplicate card IDs)

> **This is the bug the user reported.**

**What you would see:**
You add a new card. Suddenly an existing card appears "stuck" to the new one —
one above, one below — the old card keeps its previous connections, the two
behave like a single unit, and **you cannot delete them** (deleting seems to do
nothing, or removes the wrong one, or removes both).

**Exact scenario:**
1. A workspace already contains cards whose internal IDs are, say, `10`, `11`, `12`.
2. The project's ID counter (`nextId`) is at `10` instead of `13` — see the
   "How `nextId` falls behind" list below for the many ways this happens.
3. You click **Add** (or press **N**, or paste, or clone).
4. The new card is created with `id = "10"` — **the same ID an existing card
   already has.**
5. Now two different cards share ID `10`. Everything keyed by ID collides:
   - **Connections:** edges store their endpoints as `source`/`target` = a card
     ID. The old card's existing edge now also "points at" the new card, so they
     look connected.
   - **On-screen identity & stacking:** React draws list items keyed by ID; two
     items with the same key render on top of / adjacent to each other (the
     "one up, one down" stack), and layout treats them as the same slot.
   - **Deletion:** delete works purely by ID. Removing ID `10` removes *both*
     cards (or, after a re-render, one reappears), so it feels undeletable.

**Where it is:**
Every card-creation path assigns `id: nextId.toString()` and then just does
`setNextId(prev => prev + 1)` — none of them checks existing IDs:
- `addNode` — `App.jsx:5663`
- `cloneNode` — `App.jsx:6027`
- `cloneNodeToWorkspace` — `App.jsx:6065`
- single-node paste — `App.jsx:2619`
- group paste — `App.jsx:2773` (`nodeIdMap[n.id] = idCounter.toString()`)
- multi-selection paste — `App.jsx:3067`
- multi-selection duplicate — `App.jsx:~9019`

Deletion that then misbehaves on duplicates: `deleteNode` — `App.jsx:6165`
(`ws.nodes.filter(n => n.id !== id)`).

**Why it happens (root cause):**
1. **`nextId` lives in the wrong place relative to the data it protects.** Card
   IDs are minted from `nextId`, but `nextId` is stored in the **project
   metadata document**, while the cards themselves live in the separate
   **workspace document**. The two are saved and synced independently, so they
   can drift apart.
2. **Nothing reconciles `nextId` against the cards that actually exist.** A
   repo-wide search finds no code that sets `nextId = max(existing card IDs) + 1`.
   (The only `Math.max` over nodes is on their **x-position**, `App.jsx:4938`,
   not their IDs.) So if `nextId` is ever ≤ an existing card's numeric ID, the
   next card collides.

**How `nextId` falls behind (all real code paths):**
- **Missing value defaults to a low number.** On load it becomes `proj.nextId || 10`
  (e.g. `App.jsx:1239, 1588, 1625, 4090, 4180, 4511, 4827`) or, worse,
  **`proj.nextId || 1`** which is then *written back into metadata*
  (`App.jsx:1035, 1171, 4799`). A project whose stored counter is absent is thus
  reset to `1` or `10` even though its cards use much higher IDs.
- **The known sync bugs can revert it.** Because `nextId` is part of project
  metadata, Bug 5 (metadata silently reverted by an older tab) and Bug 6
  (metadata overwritten when the baseline is unknown) from the first report can
  roll `nextId` *backwards* while the workspace's cards keep their higher IDs —
  guaranteeing the next new card collides. **This directly links C1 to the sync
  report.**

**Correct behaviour:**
- Card IDs must be **guaranteed unique**. Two robust options:
  1. Mint card IDs with the app's existing collision-resistant ID generator
     (the same style used for groups/pins/images: `g-…`, `pin-…`, `img-…`)
     instead of a shared integer counter, **or**
  2. On every load / import / hydrate / project-switch, set
     `nextId = max(all existing numeric card IDs across the project) + 1`, and do
     the same defensive check inside each create path.
- Never write `nextId: … || 1` back to storage; if unknown, derive it from the
  actual cards, not a constant.

---

## 🟠 Bug C2 — Deleting a card orphans its clones in other workspaces

**What you would see:**
You delete an original card. Its clones in *other* workspaces stay behind but
become "dead": editing them no longer updates anything, and the Clone Locations
panel may point at a source that no longer exists.

**Exact scenario:**
1. In `Discovery Map`, create a card, then use **Clone to Tab…** to clone it into
   `Campaign Plan`. The clone stores `cloneSourceId = <original card ID>`.
2. Go back to `Discovery Map` and delete the original card.
3. Open `Campaign Plan`: the clone is still there, still tagged as a clone, but
   its `cloneSourceId` now references a card that no longer exists.

**Where it is:**
`deleteNode` — `App.jsx:6161-6172`. It runs through `updateActiveWorkspace`, so it
only ever touches the **currently open** workspace:
```js
const filteredNodes = ws.nodes.filter(n => n.id !== id)
  .map(n => n.cloneSourceId === id ? { ...n, cloneSourceId: null } : n);
```
The `cloneSourceId === id → null` cleanup is applied **only to the active
workspace's** cards.

**Why it happens:**
Clone relationships span workspaces (see `cloneNodeToWorkspace`, `App.jsx:6047`,
and the cross-workspace propagation in `updateNode`, `App.jsx:6125`), but the
delete cleanup is single-workspace. So clones living elsewhere keep a dangling
`cloneSourceId`.

**Correct behaviour:**
Deleting a card should reconcile clone links **across all workspaces** (mirroring
`updateNode`'s cross-workspace pass): either clear `cloneSourceId` on every clone
of the deleted card, or promote one clone to be the new source.

---

## 🟠 Bug C3 — Reminder timing data is written into synced project metadata, causing constant needless cloud writes

**What you would see:**
Even when you never touch settings, the app keeps saving to the cloud — on every
app open and roughly once a minute — just from reminders ticking. On multiple
devices this shows up as near-constant "syncing", extra conflict churn, and it
makes the known metadata-overwrite bugs fire more often.

**Exact scenario:**
1. Open a project. The reminder engine immediately stamps a `nextReminderAt`
   timestamp onto every enabled reminder.
2. That change to the `reminders` array is detected by the metadata autosave and
   uploaded — a cloud write triggered purely by opening the app.
3. Every 60 seconds, and every time any reminder fires, `lastShownAt` /
   `nextReminderAt` are rewritten → another upload, another metadata revision.
4. With two devices open, both keep bumping the same metadata document's revision
   from mere clock-ticking (not user edits), so each device constantly sees the
   other as "newer" and re-reconciles.

**Where it is:**
- Reminder engine writes runtime timestamps into `reminders` state:
  `App.jsx:3476-3480` (init `nextReminderAt`) and `App.jsx:3516`
  (`lastShownAt`/`nextReminderAt` on fire).
- Metadata autosave treats *any* change to `reminders` as a user change and
  uploads it: `App.jsx:2224-2243`
  (`JSON.stringify(projMeta.reminders) !== JSON.stringify(reminders)` →
  `markDirty(metaPath…, { reminders … })`).

**Why it happens:**
Ephemeral scheduling bookkeeping (`nextReminderAt`, `lastShownAt`) is stored in
the same array as the user's actual reminder **settings**, and the sync layer
can't tell the two apart, so it persists and uploads the throwaway timestamps.

**Correct behaviour:**
Keep reminder **scheduling state** (next/last fire times) out of synced metadata —
hold it in a ref or a separate local-only store, or strip those fields before
comparing/persisting. Only real setting changes (title, content, frequency,
enabled, active hours) should mark metadata dirty and upload.

**Note:** this amplifies Bugs 5 & 6 from the first report (more revisions = more
chances for a stale tab to silently overwrite), so fixing it also reduces
data-loss risk.

---

## 🟡 Bug C4 — The data-integrity validator can't catch duplicate card IDs, and never runs in production

**What you would see:**
Nothing — which is the problem. The very corruption in Bug C1 (two cards with the
same ID) sails past the built-in checker, so it's never flagged.

**Where it is:**
`workspaceValidator.js`. It thoroughly checks `workspaceId` consistency and that
every edge `source`/`target` references an existing object, but it **builds an ID
set with `objectIds.add(node.id)` without ever detecting that an ID was added
twice** — there is no duplicate-ID check. It's also invoked only under
`import.meta.env.DEV` (see the usage note at the top of the file), so production
builds never validate at all.

**Why it happens:**
The validator was designed around reference integrity, not uniqueness, and was
scoped to development only.

**Correct behaviour:**
- Add a duplicate-ID check per workspace (and ideally project-wide) for nodes,
  groups, pins, and images.
- Consider running a lightweight version after risky operations (import, restore,
  paste, cross-device adopt) even in production, and auto-repair or warn.

---

## 🟡 Bug C5 — Card Editor can show stale text when the open card is changed elsewhere

**What you would see:**
You have a card open in the Card Editor. The same card (or its clone) gets
updated by another action — e.g. clone propagation updates its title/content —
but the editor panel keeps showing the old text until you close and reopen it.

**Where it is:**
`CardEditorPanel.jsx:31-42`. The effect that copies the node's title/content/theme
into the editor's local fields depends only on the node **ID**:
```js
useEffect(() => { … setTitle(selectedNode.title || '') … }, [selectedNode?.id]);
```
So when the node's *content* changes but its *ID* stays the same, the local
editor state is not refreshed.

**Why it happens:**
Keying the sync effect on `selectedNode?.id` alone ignores changes to the node's
own fields while it remains selected.

**Correct behaviour:**
Also react to the relevant fields (e.g. depend on
`selectedNode?.title, selectedNode?.content, selectedNode?.theme`), while still
avoiding clobbering the user's in-progress typing (reconcile only when the
incoming value differs from what the user last committed).

---

## Summary table

| # | Severity | Area | One-line description |
|---|----------|------|----------------------|
| C1 | 🔴 | Cards / IDs | New card can reuse an existing card's ID → merged/stacked, shared connections, undeletable (**the reported bug**). |
| C2 | 🟠 | Clones | Deleting a card leaves orphaned clones (dangling `cloneSourceId`) in other workspaces. |
| C3 | 🟠 | Reminders / sync | Reminder timing values are saved into synced metadata → constant needless cloud writes + more conflict churn. |
| C4 | 🟡 | Validation | Integrity validator misses duplicate IDs and only runs in dev. |
| C5 | 🟡 | Editor UI | Card Editor shows stale text when the open card is updated elsewhere. |

---

## How to reproduce Bug C1 deliberately (for QA / verification)

Because C1 depends on the ID counter falling behind, here are two ways to force it.

**A) The "user's real-world" path (no tools, needs the sync bugs):**
1. On Device 1 and Device 2, open the same project and add several cards (so IDs
   climb well past 10).
2. Trigger the metadata-revert conditions from Bug 5/6 (older tab overwrites
   metadata) so `nextId` in the project metadata rolls back below the highest
   card ID.
3. On the tab with the stale counter, add a new card.
4. **Expected failure:** the new card collides with an existing card — they stack,
   share connections, and resist deletion.

**B) The direct path (developer tools, guaranteed):**
1. Open a workspace and note it has cards (e.g. IDs 10, 11, 12).
2. In the browser console, lower the stored counter below an existing ID:
   ```js
   const m = JSON.parse(localStorage.getItem('cm-proj-<projectId>'));
   m.nextId = 10;                       // an ID that already exists
   localStorage.setItem('cm-proj-<projectId>', JSON.stringify(m));
   ```
   (Replace `<projectId>` with the real project ID.) Reload the page.
3. Click **Add** to create a card.
4. **Expected failure:** the new card is created with ID `10`, colliding with the
   existing card — reproducing the stack / shared-connection / undeletable symptom.

---

## Suggested fix order

1. **C1 first** — it corrupts data and matches a live user report. The durable fix
   is to make card IDs collision-proof (unique-ID generator, or reconcile
   `nextId = max(existing IDs)+1` on every load/import/hydrate and inside each
   create path). This also fully protects against the metadata-revert amplifier.
2. **C3** — cheap win that both removes write-spam and reduces the data-loss
   window from the first report's Bugs 5 & 6.
3. **C2** — correctness of the clone feature.
4. **C4** — add a duplicate-ID check so regressions are caught automatically.
5. **C5** — UI polish.

---

*This report documents defects only; no application code was changed. It
complements `multi-tab-sync-bugs` (sync/multi-tab) and the QA guides
`QA-TEST-PLAN.md` (technical) and `QA-TEST-PLAN-SIMPLE.md` (plain-language).*
