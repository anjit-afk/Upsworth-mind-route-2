# ThoughtFlow — Routing Decisions & Clarifications

> Companion to `ROUTING_CONTRACT.md`. This document resolves the 8 open
> ambiguities raised in code review. Every technical claim below was verified
> against the current code. For each point: the question, what the code actually
> does today, the **recommended decision**, why, and how it reshapes the plan.
>
> **No code has been changed.** This is a decision checklist to sign off before
> we design Milestones 1–5 in detail. (Milestone 0 can still start anytime — it
> changes nothing visible.)

---

## Decisions at a glance

> **STATUS: ALL CONFIRMED by the user.** These are now settled and drive the M1–M5 design.

| # | Topic | Confirmed decision | Status |
|---|---|---|---|
| 1 | Copy/paste & tab-awareness scope | **Same-device only** (cross-device is out of scope) | ✅ Confirmed |
| 2 | What "reference mode writes nothing" means | **No writes of any kind**; shows data as of page load; refresh for newer | ✅ Confirmed |
| 3 | Where "last-used location" lives | Go with recommendation: **per-device local pointer**; the link is the source of truth per tab; bind in ONE place (don't rewrite every call site) | ✅ Confirmed (deferred to recommendation) |
| 4 | Auth / editor protection | **Not needed now.** Stay single-user/no-auth. A future **separate task** may add a "decoy entrance" (plain link looks broken-but-isn't, in the spirit of the hidden project panel). Passwords stay per-device. | ✅ Confirmed (protection deferred; decoy = separate future task) |
| 5 | Reminders scope & home | **Global (one set), stored in their own cloud doc** so they still sync across devices | ✅ Confirmed |
| 6 | Links use IDs or names | **Opaque IDs**; graceful fallback for dead links; duplicate makes new links (expected) | ✅ Confirmed |
| 7 | Cut across tabs | **Copy-only across tabs**; cut stays within a single tab | ✅ Confirmed |
| 8 | Manual sync vs auto-sync | **Auto-sync stays fully on** (3s debounce, 30s ceiling, heartbeat). **"Sync to Server" = manual "push up now"** for confirmation (still conflict-safe). Reference tabs never push. | ✅ Confirmed |

---

## 1. "Tab" vs "Device" — what's actually in scope

**The question:** Are cross-tab copy/paste (M3) and multi-tab awareness (M4) meant to work **only between tabs on the same device**, or **across your devices too** (laptop ↔ phone)?

**What the code does today (verified):**
- Clipboard = `localStorage` keys `nexus-clipboard` / `nexus-clipboard-group`. localStorage is shared only between tabs of the **same browser on the same device**.
- Tab presence = `BroadcastChannel('thoughtflow-tab-presence')`, also **same-device only**, and it only produces a yes/no `isMultiTab` flag (no per-tab count).

**Recommended decision: Same-device only, for both M3 and M4.**

**Why:**
- Your main use — the *collector* (gather objects from several workspaces into one) — happens on **one device with several tabs**. Same-device covers it fully.
- Cross-device copy/paste and cross-device "who's editing" detection would need a **cloud-backed clipboard and presence system**: new cloud writes, new failure modes, and direct tension with the "zero data loss" rule. That's a much bigger, riskier project for a rare need.
- **Honesty about M4.3 (auto-reference on collision):** it can only catch a second **tab on the same device**. If two **different devices** open the same workspace to edit, the new same-device guard won't fire — but you are **not** less protected than today: the existing revision/conflict system already guards the *canvas* across devices. The new guard is a same-device convenience layered on top.

**Impact on the plan:** M3 and M4 are explicitly scoped **same-device**. Cross-device transfer, if ever needed, is done the safe way you already have: **Sync → export/import**, or sync one device and reopen on the other.

---

## 2. Define "reference mode writes nothing" precisely

**The question:** The contract says reference mode "writes nothing," but also implies it shows fresh data. Those can conflict, because *adopting* fresh server data updates local sync bookkeeping. Which of these do we mean?
1. No **cloud** writes.
2. No cloud writes **and** no localStorage writes.
3. No writes of **any** kind — including the internal sync-state / version bookkeeping.

**What the code does today (verified):** The heartbeat interval runs `pushDirtyNow()`, `runFreshnessCheck()` (which can call `adoptServerWorkspace()` → `seedSyncState()`, a local write), and `maybeSnapshot()` — **none gated by preview mode**. So today "preview" does not actually stop background writes.

**Recommended decision: Level 3 — no writes of any kind. Reference mode shows the workspace as of page load; to see newer data, refresh the page.**

**Why:**
- Your original requirement already says **real-time collaboration is not required** for the viewer. So "snapshot at open, refresh for newer" is perfectly acceptable and by far the safest.
- It removes the contradiction: reference mode **loads once via a read-only path** and never calls the sync-state functions (`seedSyncState` / `confirmSynced` / `markDirty`), never pushes, never snapshots, never reconciles, never recovery-syncs, never writes `userMeta`/`activeTab`.
- This guarantees a reference tab can **never** disturb an editor tab on the same device (which shares that bookkeeping).

**Impact on the plan:** M2.4 is expanded to the **full** list of background routines (heartbeat push, freshness-adopt, snapshot, reconcile, cold-start recovery, userMeta/activeTab writes, retry-queue) — all off in reference mode. The M2 test becomes: "opening/using reference mode changes **nothing** in cloud or local storage, verified by watching both."

---

## 3. Where does "last-used location" live once the link drives the active workspace?

**The question:** If the link (per tab) decides which workspace is shown, and we stop treating the cloud's `activeTab` as authoritative, then when you open a **bare** URL on a fresh load, where does "take me to my last place" come from?

**What the code does today (verified):** `activeTab` lives in project meta, is marked dirty, and is synced to the cloud; `userMeta.activeProjectId` is written on every switch. Two tabs/devices therefore overwrite each other's "current location."

**Recommended decision:**
- **The link is the source of truth for what a tab shows** (per tab).
- **A per-device local pointer** (e.g. `cm-last-location = { projectId, workspaceId }`, **not** synced) provides the default when you open a bare URL. If two tabs overwrite it, that's harmless — it's just a bookmark hint, never real data.
- **Keep the existing cloud `activeTab`/`activeProjectId` writes as-is** for now (so first-load on a brand-new device still has a sensible default), but **stop reading them to decide what a tab displays.**

**Important scope correction (this de-risks the review's concern):** We do **not** rewrite every `setActiveTab(...)` call site (pins, portals, clone-focus, project switch, boss-key cycle). Those keep working exactly as they do. We add the link binding in **one** place: a small two-way sync between the existing `activeTab` state and the link. So all existing navigation keeps calling `setActiveTab` as before; the link just mirrors it. This makes M1.3 a small, contained change, not a sprawling refactor.

**Impact on the plan:** M1.3 is reframed as "add a single `activeTab` ↔ link mirror," and M1.4's "last-used" is defined as the per-device local pointer.

---

## 4. No authentication — what "addressable" and "protection" really mean

**The question:** With no login and a single shared cloud namespace, what does editor protection (M1.5) actually buy, and should we do it now?

**What the code does today (verified):** One global namespace (`userMeta/main`, `projects/{id}`), **no auth**, no per-user scoping. Project passwords are **localStorage-only** (the hash is deliberately stripped from the cloud and re-read locally).

**Consequences to state plainly:**
- A link is **per-device obscurity only**. Anyone who loads the deployed app reads the same data. The link is *not* a security boundary.
- **Project passwords do not travel between devices.** Open a password-protected project's link on a **new** device and the password isn't present locally, so the gate may simply **not apply** there. This is existing behavior — routing doesn't cause it, but "addressable links" makes it more visible.

**Recommended decision:**
- **Confirm the app stays single-user / no-auth / global namespace.**
- **Defer M1.5 (editor obscurity/protection).** It adds complexity for little real protection.
- Treat **real** security as a **separate task**: cloud-side **security rules** (and, if you want cross-device passwords, sync the password hash to the cloud deliberately). I recommend doing the rules task; it's the only thing that truly protects the data.

**Impact on the plan:** M1.5 becomes "Deferred (optional)"; a new standalone item "Cloud security rules" is recommended but tracked outside this routing work.

---

## 5. Reminders — global or per-project, and where stored?

**The question:** "Make reminders separate" — does that mean **one global set shared by all projects** (a behavior change), and do they still **sync across your devices**?

**What the code does today (verified):** Reminders are **per-project** (`projMeta.reminders`) and sync to the cloud inside the project doc (dirty-marked).

**Recommended decision: Global (one reminder set for you), stored in its own dedicated cloud document, still synced across devices.**

**Why:**
- You said reminders should be "completely separate" and are low-stakes / opened once in months — a single global set is the simplest mental model and removes them from the project entirely.
- **Local-only storage would break multi-device** (reminders wouldn't appear on your other devices). Their **own cloud doc** keeps them syncing while removing them from the project's conflict surface.
- Being in their own doc means the multi-tab risk on reminders is minimal, and the red info box (M4.2) still covers the rare case.

**Please confirm:** moving from per-project to **global** is a **behavior change** (all projects share the same reminders). If you'd rather keep reminders *per project* but just move them out of the project meta file, that's also possible — say which you prefer. My recommendation is **global + own cloud doc**.

**Impact on the plan:** M5 storage home is defined (own cloud doc, synced), and M5 explicitly notes the global-vs-per-project behavior choice.

---

## 6. Links: IDs or names? What happens after duplicate / import / restore?

**The question:** In `#/editor/<project>/<workspace>`, are those **IDs** or **names**, and do bookmarked links survive duplicating, importing, or restoring a backup?

**What the code does today (verified):** IDs are opaque UUIDs from `generateId()`. `duplicateProject` / `duplicateWorkspace` create **new** IDs; `importAllData` can reassign IDs.

**Recommended decision:**
- **Links use IDs** (names collide and change; IDs are stable for a given item).
- **Dead/unknown links never crash** — they fall back to the per-device last-used location or a simple picker.
- **Expected behavior to accept:** a **duplicate** is a new item with a **new** link (correct). A **full-backup restore that reassigns IDs** would break old bookmarks.

**Optional hardening (your call, later):** make import/restore **preserve original IDs** where safe, so old links keep working. Not required for now.

**Impact on the plan:** M1.1 states "IDs, not names"; M1.2 adds graceful fallback for unknown links.

---

## 7. Cut across tabs — allowed or copy-only?

**The question:** The collector is framed around **copy**, but the app also supports **cut** (which deletes the source, possibly in another workspace). Should cross-tab transfer allow cut?

**What the code does today (verified):** `cutNode` / `cutGroup` / `cutMultiSelection` mark the clipboard `action: 'cut'`, and paste then **removes the source** — even when the source is in a different workspace.

**Recommended decision: Cross-tab transfer is COPY-ONLY. Cut stays available only within a single tab (as today).**

**Why:** Under your manual-sync habit, a cross-tab/cross-device **cut** is genuinely dangerous: the source-removal and the paste can land in different sync orders and lose data. Copy has no such risk (the source is never touched). Reference mode can't cut anyway (no edits). Restricting cross-tab to copy removes the risk entirely with no real loss of function.

**Impact on the plan:** M3 explicitly carries **copy** data across tabs only; the shared clipboard ignores `cut` intent for cross-tab paste.

---

## 8. Manual "Sync → wait for Synced" vs the always-on automatic sync

**The question:** Your safety guide says *you* decide when data leaves a device, but the app also syncs automatically (3-second debounce with a 30-second ceiling, plus pushes on focus/visibility/online/heartbeat, plus adopting newer server data on return). How are these two meant to coexist?

**What the code does today (verified):** Automatic sync is always on; the manual "Sync to Server" forces an immediate flush and shows status.

**Confirmed decision — the intended contract:**

There are **two directions** of sync, and it's important they're not confused:

- **Pull DOWN (cloud → this device):** happens **automatically** on load, focus, and return. Never a button. If the cloud is newer *and* this device has **no unsaved edits**, it silently adopts the newer version. If the cloud is newer *and* this device **has** unsaved edits, it **stops and asks** which to keep (never silently overwrites either side). This is the core data-loss protection.
- **Push UP (this device → cloud):** happens **automatically** (3-second debounce, 30-second ceiling, plus heartbeat safety pushes) **and** on demand via the **"Sync to Server"** button.

So:
- **Automatic sync stays fully ON in editor mode.** It is the primary safety mechanism.
- **"Sync to Server" means "push my current work up to the cloud right now"** — a force-flush so the user can *see* "Synced" and *know* it's safe before closing or switching devices. It does **not** pull data down, and it is **still conflict-safe** (it goes through the same version check, so it can't clobber newer cloud data — it surfaces a conflict instead).
- **Reference tabs never push at all** (per Decision 2).

**Version model (confirmed correct):** each cloud save increments a version number (v1, v2, …); **highest = newest**. Each local copy records the cloud version it is *based on*. A device that is "behind" (e.g. based on v13 while cloud is v14) pulls the newer version on load/return, per the rules above.

**Impact on the plan:** No behavior change to editor auto-sync. The contract simply states this coexistence explicitly so the two models aren't ambiguous.

---

## How this reshapes `ROUTING_CONTRACT.md`

- **M1.3** → "single `activeTab` ↔ link mirror" (small), plus per-device `cm-last-location` for M1.4's default.
- **M1.1/1.2** → links use IDs; unknown links fall back gracefully.
- **M1.5** → **Deferred**; add a separate recommended "Cloud security rules" task.
- **M2.4** → expanded to the **full** list of background write routines; reference mode = **no writes of any kind**, snapshot-on-load.
- **M3** → **same-device, copy-only**.
- **M4** → **same-device**; requires a small **tab registry** (ids + heartbeats + expiry) to report an accurate count and clear stale tabs — a small new subsystem, not just tuning the existing flag.
- **M5** → reminders **global, own cloud doc, synced**; confirm the global-vs-per-project behavior change.

---

## Final sign-off checklist (ALL CONFIRMED)

- `[x]` 1. Same-device only for copy/paste and tab-awareness.
- `[x]` 2. Reference mode = **no writes of any kind**, refresh for newer data.
- `[x]` 3. Link is per-tab truth; per-device last-location pointer for bare URLs (deferred to recommendation).
- `[x]` 4. Stay no-auth; protection deferred; a **decoy entrance** is a separate future task; passwords stay per-device.
- `[x]` 5. Reminders **global + own cloud doc (synced)** — global behavior change accepted.
- `[x]` 6. Links use **IDs**, dead links fall back gracefully.
- `[x]` 7. Cross-tab transfer **copy-only**.
- `[x]` 8. Auto-sync stays on; **"Sync to Server" = manual push-up (conflict-safe)**; reference tabs never push.

**All decisions are settled.** Next step: begin **Milestone 0** (invisible routing groundwork) on approval, then design M1/M2 in detail using these decisions.

---

## Parked for later (separate tasks, not part of routing)

- **Decoy editor entrance (Decision 4):** the plain link (without the editor route) shows something that *looks broken but isn't*, to keep casual people out — same spirit as the hidden project panel. To be specced separately when the user chooses.
- **Cloud security rules:** the only *real* data-protection boundary; recommended but tracked outside this routing work.
