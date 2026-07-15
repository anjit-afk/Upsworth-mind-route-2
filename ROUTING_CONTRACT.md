# ThoughtFlow — Routing & Multi-Tab Contract

> A plain-English, contract-style plan. We build it in small, independently
> testable steps. **Nothing moves to the next step until you approve the current
> one.** No step is allowed to risk your data.

---

## 0. The Golden Rules (apply to every step)

1. **Never disturb the sync engine.** The save/sync/conflict system stays untouched, except the single, isolated reminders change in Milestone 5.
2. **Never lose a project or a workspace.** We keep the existing repair + "tombstone" safety net and never introduce a fragile shared list that one tab could overwrite.
3. **Viewing and copying can never harm the original.** Reference/Collector mode writes nothing.
4. **One app, built once.** Moving between links must never rebuild the app or re-run its startup — that is the main danger and we design specifically to avoid it.
5. **Each step is independently testable and reversible.** If something breaks, it's isolated to the one small step we just did.
6. **Storage-touching steps get a backup first.** Only Milestone 5 touches storage; before it, we export a backup.

---

## 1. What We Agreed To Build (scope)

- **Addressable app:** every project + workspace has its own link (using `#`-style links, e.g. `.../#/editor/<project>/<workspace>`).
- **Editor route:** the normal editing experience, behaves exactly like today.
- **Reference / Collector mode:** a link that opens a workspace where you can **pan, select, and copy — but not edit**. Its main purpose is gathering objects from several workspaces into the one you're building.
- **Editor → View entry + reference polish (M2.5):** a **"View" button in the editor** opens the current workspace in a **new reference tab**; the reference top-bar "Data & sync" menu **hides write actions** (e.g. "Sync now"); **version history is previewable read-only** from a reference tab (no restore/write).
- **Cross-tab copy/paste:** copy in one browser tab, paste into a workspace open in another browser tab.
- **Multi-tab awareness:**
  - Different workspaces / different projects in different tabs → welcome, no nagging.
  - A **soft** "you have N tabs open" note (informational only).
  - Same **project** open in more than one tab → a **soft red info box inside the Pin, Task, and Reminder panels** ("better to close other tabs to avoid losing task/pin changes").
  - Same **workspace** opened in a second editor → automatically open the second one in **Reference mode** (look-and-copy only), sidestepping collisions.
- **Reminders separated** from the project's storage (the single, isolated storage change).
- **Sharing (later, low priority):** a "create read-only frozen duplicate" that is isolated, carries origin + date, gets its own link, appears in a "Shared" list, and is trashable.
- **Pins keep working** exactly as today (clicking a pin in another workspace jumps to it in the same tab; the link follows along).

### Out of scope (dropped or deferred)
- In-app tab-switch buttons and split-screen (dropped — separate browser tabs cover the need more simply).
- Live real-time sharing (deferred — the frozen-duplicate approach is enough).

---

## 2. How Approval Works (the contract)

For **every milestone**, the cycle is:

1. **You approve the milestone** (reply "Approved: Milestone X", or ask for changes).
2. **I implement only that milestone**, one sub-task at a time.
3. **I push it to a branch / PR** so you can read the change on GitHub.
4. **You test it** using that milestone's Test Checklist (below).
5. **You sign off** ("Approved") or list what's wrong.
6. **Only then** do we start the next milestone.

- You may approve **sub-task by sub-task** if you prefer even smaller steps.
- Any step that could touch data (only Milestone 5) requires a **fresh JSON export backup first**.
- At any point you can say "pause" or "revert the last step" and we stop cleanly.

**Sign-off legend used below:** `[ ]` = not started · `[~]` = in progress · `[x]` = approved by you.

---

## 3. The Milestones

Order: **M0 → M1 → M2 → M2.5 → M3 → M4 → M5 → M6 (later)**.

### Progress log (kept up to date)

- **M0 — Routing foundation** — ✅ DONE, merged (PR #3).
- **M1 — Addressable editor** — ✅ DONE, merged (PR #4).
- **M2 — Reference / Collector mode** — ✅ DONE, merged (PR #5).
- **Post-M2 fix — Reference robustness** — ✅ DONE, merged (PR #6). Two fixes:
  1. `isReferenceMode` is now **reactive to the URL** (a `/view/` URL is always read-only; an `/editor/` URL is always the full editor → project switching works).
  2. `init()` is now **URL-driven**: a `/view/` link (or `/editor/` deep-link) loads and displays the **project the URL names** from the cloud — fixing "view showed the default project + a stale workspace". This also delivered cross-project deep-linking (previously deferred) and made reference tabs truly read-only to shared storage.
- **M2.5 — Reference-mode polish** — ⬜ NEXT (added from user feedback; see below).
- **M3 → M6** — not started.

---

### `[x]` Milestone 0 — Routing Foundation (changes nothing you can see) — ✅ DONE (PR #3)

**Goal:** Put the link-handling plumbing in place so every link still lands in the editor exactly as today. Purely invisible groundwork.

**Risk:** Low · **Depends on:** nothing.

- `[ ]` **0.1 — Add the routing library**
  - *Strategy:* Add the standard, stable routing library; confirm the app still builds and runs. No logic yet.
  - *What could go wrong / be misunderstood:*
    - Pulling a newer, different-behaving version than intended.
    - "While we're here" touching the sync/persistence code — **forbidden**.
- `[ ]` **0.2 — Wrap the app so it's mounted exactly once**
  - *Strategy:* Wrap the existing app in the link-handler at the top level, as a single always-present child. **Do not** place the app "inside" route-branches (that would rebuild it on every navigation — the #1 danger).
  - *What could go wrong / be misunderstood:*
    - Putting the app inside route branches → app rebuilds on navigation → re-runs startup, risks interrupting saves. **This is the classic mistake to avoid.**
    - Removing safety wrappers "to simplify".
- `[ ]` **0.3 — Add a "link → intent" reader (everything = editor for now)**
  - *Strategy:* A small, pure helper that reads the link and, for now, always answers "editor". No side effects, no saving.
  - *What could go wrong / be misunderstood:*
    - Putting saving/loading logic inside this reader (it must stay pure).
    - Making unknown links show nothing instead of defaulting to the editor.

**Test Checklist (M0):**
- App loads and works at `/`, after refresh, and at random links — all show the editor.
- Full feature pass: editor, arrange, preview toggle, tasks, pins, images, connections, groups, export/import, password, autosave, workspace/project switch, undo/redo, clipboard, multi-select, shortcuts.
- Startup runs **once** (no double-loading), no new errors.

**Approval:** You confirm the app is visibly identical to before. `[ ]` **Approved**

---

### `[x]` Milestone 1 — Addressable Editor (project + workspace in the link) — ✅ DONE (PR #4)

**Goal:** Give the editor real links that carry both the project and the workspace, so links open the right place and can later be opened in separate tabs.

**Risk:** Low–Medium · **Depends on:** M0.

- `[ ]` **1.1 — Define the link shape**
  - *Strategy:* `.../#/editor/<project>/<workspace>`. Document it once, in one place.
  - *What could go wrong / be misunderstood:*
    - Putting only the workspace (not the project) in the link — panels are project-wide, so the project must be in the link.
- `[ ]` **1.2 — Open the project + workspace named in the link**
  - *Strategy:* On load, read project + workspace from the link, then **load the whole project exactly as the app does today** and show the requested workspace. Panels need no change — they're fed from the loaded project.
  - *What could go wrong / be misunderstood:*
    - Trying to load "just a workspace" — impossible, panels are project-wide; must load the parent project.
    - Writing anything to storage while opening (opening is read-only navigation).
    - Crashing on an unknown/old link instead of falling back gracefully.
- `[ ]` **1.3 — Keep the link in sync with the current view**
  - *Strategy:* When you switch workspace (tabs, or a pin jump to another workspace), quietly update the link to match, so refresh stays put and links stay shareable.
  - *What could go wrong / be misunderstood:*
    - Writing the "active workspace" back into the shared project file on every switch (this must become a per-tab, link-only thing — that's what stops tabs fighting).
    - Causing the app to rebuild on each link update (it must be a quiet update, not a reload).
- `[ ]` **1.4 — Root / unknown links redirect sensibly**
  - *Strategy:* `/` and unrecognised links go to the last-used (or default) editor location, once, without loops.
  - *What could go wrong / be misunderstood:*
    - Redirect loops; redirecting on every render.
- `[ ]` **1.5 — (Optional) Editor access protection**
  - *Strategy:* Non-obvious editor link + reuse the **existing** password gate + remember trusted device (local-only). Decide now whether to enable in M1 or defer.
  - *What could go wrong / be misunderstood:*
    - Believing a secret link = real security. It is **obscurity only**; real protection needs cloud-side rules (separate, recommended task).
    - Saving the "trusted device" flag to the cloud (must be local-only) or blocking *data loading* behind the gate (only the UI is gated, as today).

**Test Checklist (M1):**
- A workspace link opens the correct workspace with all panels working.
- Refresh keeps you on the same workspace; the link is shareable.
- Clicking a pin in another workspace still jumps + highlights (M1 must not break pins).
- Switching workspaces updates the link but does **not** rebuild the app or add cloud writes.
- Full editor regression still passes.

**Approval:** `[ ]` **Approved**

---

### `[x]` Milestone 2 — Reference / Collector Mode (read-only, but copyable) — ✅ DONE (PR #5 + robustness fix PR #6)

**Goal:** A link that opens a workspace where you can pan, select, and copy — but cannot edit — and that **writes absolutely nothing**.

**Risk:** Medium · **Depends on:** M0, M1.

- `[ ]` **2.1 — Reference link shape → intent**
  - *Strategy:* `.../#/view/<project>/<workspace>` is recognised as reference mode.
  - *What could go wrong / be misunderstood:*
    - Assuming the workspace is always in the currently-active project — it must load the project named in the link.
- `[ ]` **2.2 — Lock into read-only-but-copyable**
  - *Strategy:* Reuse the existing "preview" lock, but **leave selecting and copying switched on** (selecting/copying never changes the workspace). Block edit / move / delete / add. Hide edit-only buttons and disable "exit to edit".
  - *What could go wrong / be misunderstood:*
    - Reusing "preview" as-is, which currently blocks copying too — copy **must remain enabled** here (that's the whole point).
    - Leaving an "exit preview → edit" button that lets a reference tab start editing.
    - Building a brand-new second renderer instead of reusing the existing one (regression risk).
- `[ ]` **2.3 — Open the requested workspace; panels available read-only**
  - *Strategy:* Show the requested workspace; panels display but their edit actions are inert.
  - *What could go wrong / be misunderstood:*
    - Panel buttons that still mutate data in reference mode.
- `[ ]` **2.4 — Switch OFF every write-capable startup/background routine**
  - *Strategy:* In reference mode, skip the interrupted-save recovery, the workspace-list repair, the "push my edits" routine, the auto-snapshots, and the "mark unsaved on close" flag. Reads are fine; **writes are zero**.
  - *What could go wrong / be misunderstood:*
    - Relying only on the per-action edit-blocks (those stop *user edits*, not these background routines — this is the subtle gap).
    - Consuming/clearing the shared "unsaved" flag in reference mode (would rob an editor tab on the same device of its recovery).

**Test Checklist (M2):**
- A `view` link shows the workspace; pan/zoom works; nothing is editable.
- You can select objects and **copy** them.
- With developer tools watching, opening/using reference mode makes **no cloud writes** and changes **no** local sync bookkeeping.
- Editor route entirely unaffected.

**Approval:** `[ ]` **Approved**

---

### `[ ]` Milestone 2.5 — Reference-Mode Polish (from user feedback)

**Goal:** Make reference mode convenient and clean: give the editor a one-click way to open a reference tab, remove the leftover write control from the reference top-bar menu, and let version history be *previewed* (read-only) from a reference tab.

**Risk:** Low–Medium · **Depends on:** M2. **No data writes introduced.**

- `[ ]` **2.5.1 — "View" button in the editor toolbar**
  - *Why:* A reference tab can't switch projects (by design). So the natural flow is: switch to the project **in the editor**, then click **View** to open that project's current workspace in a **new tab** in reference mode. No more hand-editing URLs.
  - *Strategy:* Add a small **View** button (editor only) that opens `#/view/<currentProject>/<currentWorkspace>` in a **new browser tab** (e.g. `window.open`). Purely a navigation convenience — writes nothing.
  - *What could go wrong / be misunderstood:*
    - Opening in the **same** tab (would turn the editor into a viewer) — it must open a **new** tab.
    - Showing the button in reference tabs (it's editor-only).
    - Building the link from stale state — use the currently displayed project + workspace.
- `[ ]` **2.5.2 — Remove write controls from the "Data & sync" menu in reference tabs**
  - *Why:* The top-bar "Data & sync" popover still shows **"Sync now"** in a `/view/` tab (see user screenshot). A read-only viewer must not offer a push-to-cloud action.
  - *Strategy:* In reference tabs, **hide "Sync now"** (and any other write action) in that popover. Keep read-only items (device name display, and Version history — see 2.5.3). The handler is already guarded; this removes the misleading UI. Audit the popover for any other write buttons.
  - *What could go wrong / be misunderstood:*
    - Only hiding the *sidebar* sync button (already done) but forgetting **this popover** — the popover is a separate place.
    - Hiding read-only info that's still useful (device name, sync status label).
- `[ ]` **2.5.3 — Version history = read-only PREVIEW in reference tabs**
  - *Why:* In a reference tab you want to *look at* an old version (like loading that version locally, just to preview it) — **without restoring** it (restore writes/overwrites).
  - *Strategy:* Allow opening the Version history list and **loading a chosen snapshot into the current reference view in-memory only** (a temporary, read-only preview — no `restoreSnapshot`, no `createSnapshot`, no cloud/local writes). The **Restore** and **"Save a version now"** actions stay disabled/hidden in reference. Provide a clear "previewing version <date> — this is not your live data" indicator and a way back to the live view.
  - *What could go wrong / be misunderstood:*
    - Reusing `restoreSnapshot` (it WRITES + pushes) — preview must be a pure in-memory load of the snapshot payload, nothing else.
    - Leaving the preview ambiguous with the live view — label it clearly.
    - Persisting the previewed snapshot to localStorage/Firestore (must not).

**Test Checklist (M2.5):**
- Editor shows a **View** button; clicking it opens the current workspace in a **new tab** in reference mode; the editor tab is unaffected.
- In a reference tab, the "Data & sync" popover has **no "Sync now"** (and no other write action); DevTools shows no writes.
- In a reference tab, Version history can be opened and a past version **previewed** read-only; **Restore** / "Save a version now" are unavailable; no writes occur; returning to the live view works.
- Editor tabs: View button aside, everything (including Sync now and full Version history/restore) behaves exactly as before.

**Approval:** `[ ]` **Approved**

---

### `[ ]` Milestone 3 — Cross-Tab Copy / Paste

**Goal:** Copy in one browser tab (editor or reference) and paste into a workspace open in another tab.

**Risk:** Low–Medium · **Depends on:** M2.

- `[ ]` **3.1 — Route the app's clipboard through shared storage**
  - *Strategy:* When you copy, also place the copied objects in the shared browser drawer so other tabs can read them. Keep the existing in-tab copy behaviour identical.
  - *What could go wrong / be misunderstood:*
    - Changing how paste works *within* a tab (must stay the same).
    - Pasting objects with stale IDs that clash — must give pasted items fresh IDs (as in-tab paste already does).
- `[ ]` **3.2 — Paste reads the shared clipboard**
  - *Strategy:* Paste checks the shared drawer, so it works whether you copied in this tab or another.
  - *What could go wrong / be misunderstood:*
    - Blocking paste in the editor because the copy "came from" a reference tab — paste-into-editor must be allowed (only the *source* was read-only).
- `[ ]` **3.3 — Verify collector flow end-to-end**
  - *Strategy:* Reference-copy in Tab A → paste into the editor in Tab B.
  - *What could go wrong / be misunderstood:*
    - Assuming images/pins copy cleanly — verify these specifically.

**Test Checklist (M3):**
- Copy in Tab A (editor), paste in Tab B (editor) → works.
- Copy in Tab A (reference), paste in Tab B (editor) → works.
- In-tab copy/paste unchanged; pasted items get new IDs; nothing corrupted.

**Approval:** `[ ]` **Approved**

---

### `[ ]` Milestone 4 — Multi-Tab Awareness & Guardrails

**Goal:** Welcome multi-tab use, warn only when it actually matters, and steer you away from the risky case.

**Risk:** Medium · **Depends on:** M1 (and benefits from M2).

- `[ ]` **4.1 — Soft "N tabs open" note; stop nagging for safe cases**
  - *Strategy:* Turn the existing multi-tab warning into a gentle, non-blocking note. Different workspaces / different projects → no alarm.
  - *What could go wrong / be misunderstood:*
    - Leaving the old loud warning on, which would fight the new multi-tab feature.
- `[ ]` **4.2 — Same PROJECT in >1 tab → red soft info box in Pin, Task, and Reminder panels**
  - *Strategy:* Detect that the same project is open in more than one tab; show a red info box **inside each of the Pin, Task, and Reminder panels** with a helpful suggestion ("This project is open in another tab — better to close the others to avoid losing task/pin changes").
  - *What could go wrong / be misunderstood:*
    - Warning on same-*workspace* only — the shared risk is at the **project** level (tasks + pin-categories), so the trigger must be the project.
    - Making it a blocking popup instead of a calm in-panel note.
    - False positives from a tab that closed but didn't clean up (must expire stale tab records).
- `[ ]` **4.3 — Same WORKSPACE opened in a second editor → auto-open as Reference mode**
  - *Strategy:* If you open a workspace in the editor that's already being edited in another tab, the new tab opens in Reference mode instead, avoiding the collision entirely.
  - *What could go wrong / be misunderstood:*
    - Detecting "same workspace" incorrectly (must match project + workspace).
    - Silently dropping the user into reference mode with no explanation — show a short note why.

**Test Checklist (M4):**
- Two tabs, different workspaces/projects → only the soft "N tabs" note, no alarm.
- Two tabs, same project → red info box appears in Pin, Task, and Reminder panels.
- Opening an already-editing workspace in a second tab → it opens read-only (reference) with a note.
- Closing a tab clears its record (no lingering false warnings).

**Approval:** `[ ]` **Approved**

---

### `[ ]` Milestone 5 — Separate Reminders From the Project (the one storage change)

**Goal:** Move reminders out of the project's shared file into their own place, shrinking the multi-tab conflict surface. **Requires a backup export first.**

**Risk:** Medium (touches storage) but low-stakes (reminders are rare) · **Depends on:** ideally after M4.

- `[ ]` **5.0 — Backup first**
  - *Strategy:* Export a JSON backup before any storage change.
- `[ ]` **5.1 — Give reminders their own storage spot**
  - *Strategy:* Define a separate location for reminders, independent of the project file.
  - *What could go wrong / be misunderstood:*
    - Assuming reminders are per-workspace — they're per-user/global now (your request).
- `[ ]` **5.2 — Safe one-time migration**
  - *Strategy:* Read existing reminders from the old (project) spot → write to the new spot → if the new spot is empty, fall back to the old → keep the old copy as a backup, don't delete it immediately.
  - *What could go wrong / be misunderstood:*
    - Deleting the old reminders before confirming the new spot is good.
    - Running the migration repeatedly and duplicating reminders (guard it to run once).
- `[ ]` **5.3 — Point the Reminder panel at the new source; stop writing reminders into the project file**
  - *Strategy:* The panel reads/writes the new spot; the project file no longer carries reminders.
  - *What could go wrong / be misunderstood:*
    - Leaving a code path that still writes reminders into the project file (defeats the purpose).

**Test Checklist (M5):**
- All existing reminders are still present after the change.
- Editing reminders no longer writes to the project file.
- Two tabs on the same project no longer risk each other's reminder edits.
- Backup export exists and restores correctly.

**Approval:** `[ ]` **Approved**

---

### `[ ]` Milestone 6 — Sharing via Frozen Duplicate (LATER / low priority)

**Goal:** A once-in-a-few-months share: make an isolated, read-only, frozen copy that can't harm anything.

**Risk:** Low (isolated) · **Depends on:** M2 (reuses reference mode).

- `[ ]` **6.1 — "Create shareable copy" action**
  - *Strategy:* Duplicate the workspace into a frozen, isolated copy carrying origin project + date; it belongs to no project.
  - *What could go wrong / be misunderstood:*
    - Linking the copy back to the live workspace (must be fully independent).
- `[ ]` **6.2 — Store shares separately; trashable**
  - *Strategy:* Keep shares in their own bucket; deleting a share never touches the original.
- `[ ]` **6.3 — Own link per share + a "Shared" list**
  - *Strategy:* `.../#/shared/<id>` opens one share; an in-app "Shared" list manages/trashes them.
- `[ ]` **6.4 — Shared view reuses Reference mode**
  - *Strategy:* Opening a share uses the read-only reference presentation.
  - *What could go wrong / be misunderstood:*
    - Allowing edits on a share; letting a share write back anywhere.

**Test Checklist (M6):**
- Creating a share doesn't alter the original.
- The share link opens read-only.
- Trashing a share leaves the original untouched.

**Approval:** `[ ]` **Approved**

---

## 4. Known Limitations (so there are no surprises)

- **Link-based access is obscurity, not true security.** Real protection needs cloud-side rules (a separate, recommended task).
- **Multi-tab warnings are a human guardrail**, not an ironclad lock. Combined with auto-Reference-mode they cover your real usage. A stronger "tabs can't clobber each other even if ignored" option exists as a future upgrade.
- **Reference mode loads the full app** (heavier than a slim viewer) because it safely reuses the tested renderer. Fine for now.
- **`#`-style links** are the simplest, most host-proof choice; they contain a `#`.

---

## 5. Definition of Done (whole project)

- Editor links work; Reference mode works and provably writes nothing.
- Cross-tab copy/paste works; multi-tab guardrails behave correctly.
- Reminders separated with zero reminder loss.
- Every existing feature behaves exactly as before; no regressions.
- No data loss or corruption under any tested scenario, including multi-tab.
- Every milestone reviewed, tested, and approved by you.

---

## 6. Open Questions To Confirm Before M1 Detail

1. Enable editor protection in **M1**, or defer it?
2. Should I also draft **cloud-side security rules** as a separate task (recommended)?
3. Confirm the link shapes: `#/editor/<project>/<workspace>`, `#/view/<project>/<workspace>`, `#/shared/<id>`.
4. Confirm you're happy for **M0 to change nothing visible** as the first step.
