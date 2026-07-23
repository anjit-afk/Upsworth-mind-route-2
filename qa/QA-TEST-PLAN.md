# Upsworth / ThoughtFlow — Complete QA Test Plan

> **Purpose:** A ready-to-run, click-by-click QA script for the whole app, with a
> special focus on the multi-tab and sync/conflict subsystems. Every test uses
> **fixed names and values** so a tester never has to invent a project name, a
> workspace name, or a card title. Just do exactly what each step says.
>
> **How to use this document**
> 1. Do **Section 0 (Setup)** once. It prepares your browsers, DevTools, and the
>    exact fixture data every later test reuses.
> 2. Work top to bottom. Each test case has an ID (e.g. `MT-01`), preconditions,
>    numbered steps, and an **Expected result**.
> 3. Record the outcome in the **Result** box: `PASS`, `FAIL`, or `BLOCKED`, plus
>    a note. If it FAILs, capture a screenshot and the browser console output.
> 4. Tests tagged **[BUG #n]** are expected to currently FAIL — they map to the
>    known bug report. Confirm the failure symptom matches, then mark
>    `FAIL (confirms BUG #n)`.
>
> **Legend**
> - 🔴 Critical (can lose data) · 🟠 High (wrong info / flicker) · 🟡 Medium (edge case) · ⚪ Normal feature check
> - **Tab A / Tab B** = two tabs in the **same** browser profile (share localStorage + BroadcastChannel).
> - **Device 1 / Device 2** = two **different** browser profiles or two different machines (do NOT share localStorage).

---

## Section 0 — One-time setup (do this first)

### 0.1 Environment
- **ENV-01** — Use the latest Chrome (or Chromium) as the primary browser.
- **ENV-02** — Have a second, independent browser profile ready and call it **Device 2**
  (Chrome menu → *Profiles* → *Add* → name it `QA-Device-2`). Device 2 must be
  signed into the same app/Firebase project but must NOT share localStorage with Device 1.
- **ENV-03** — Confirm the app is running against a **real Firebase** project (cloud sync ON).
  If a build has Firebase disabled, note it — cloud tests (Sections MT-cloud, CF, SL) will be `BLOCKED`.
- **ENV-04** — Open DevTools (F12) in every tab you test. Keep the **Console** and
  **Application → Local Storage** panels visible. You will read keys from here often.
- **ENV-05** — In DevTools **Console**, paste this helper once per tab so you can
  inspect sync state quickly (it prints the whole `cm-sync-state` map):
  ```js
  window.qaSync = () => JSON.parse(localStorage.getItem('cm-sync-state') || '{}');
  window.qaDump = (p) => console.table(window.qaSync()[p] || {msg:'no entry for '+p});
  ```

### 0.2 localStorage keys you will inspect
| Key | Meaning |
|-----|---------|
| `cm-meta` | Global metadata (list of project ids, default project). |
| `cm-proj-<projectId>` | Per-project metadata: name, workspaceIds, reminders, pinGroups, password hash, etc. |
| `cm-ws-<projectId>-<workspaceId>` | One workspace's canvas (nodes, edges, groups, pins, images). |
| `cm-tasks-<projectId>` | Tasks + task groups for a project. |
| `cm-sync-state` | Map of `path → { baseRev, syncedHash, dirty }`. **The heart of conflict detection.** |
| `cm-tombstones` | Deleted-workspace markers (prevent resurrection). |
| `cm-dirty-flag` | "An editor tab on this device has unsynced edits." |
| `cm-conflict-backups` | Local backups saved whenever a conflict is resolved. |
| `cm-last-location` | Per-device last-open project/workspace pointer (not synced). |
| `cm-last-snapshot` | Timestamp of last auto snapshot. |
| `cm-retry-queue` | Queued cloud writes awaiting reconnect. |
| `cm-device` | This device's display name/id. |
| `thoughtflow-tab-id` | (Fallback only) single-key tab presence for browsers without BroadcastChannel. |

> **Reading a doc's revision:** `window.qaDump('cm-proj-<projectId>')` shows that
> project-metadata document's `baseRev`, `syncedHash`, and `dirty`. Replace the
> path with `cm-ws-<projectId>-<wsId>` for a workspace or `cm-tasks-<projectId>` for tasks.

### 0.3 How to simulate conditions
- **Go offline:** DevTools → **Network** tab → throttling dropdown → **Offline**.
  (Do NOT just unplug wifi; the Network=Offline toggle is repeatable.)
- **Come back online:** set throttling back to **No throttling** / **Online**.
- **Force `baseRev = null` (for BUG 6):** DevTools Console:
  ```js
  const s = JSON.parse(localStorage.getItem('cm-sync-state')||'{}');
  const path = 'cm-ws-<projectId>-<wsId>';           // fill in real ids
  s[path] = { ...(s[path]||{}), baseRev: null, dirty: true };
  localStorage.setItem('cm-sync-state', JSON.stringify(s));
  ```
  then edit that workspace so it stays dirty, and do not reload.
- **Simulate a browser without BroadcastChannel (for BUG 4):** DevTools Console,
  **before loading the app** (or in a fresh tab, then reload):
  ```js
  window.BroadcastChannel = undefined;
  ```

### 0.4 Build the standard fixture data (create EXACTLY these)
Create these once on **Device 1**. Every later test references them by name.

**Projects (create in this order):**
1. `Alpha Marketing`  ← leave this as the **default** project
2. `Beta Research`
3. `Gamma Personal`

**Workspaces inside `Alpha Marketing` (use Workspace Manager → New Workspace, type the name, Create):**
- `Discovery Map`
- `Campaign Plan`
- `Retro Board`

**Workspaces inside `Beta Research`:**
- `Literature Review`
- `Experiment Notes`

**Workspaces inside `Gamma Personal`:**
- `Home Ideas`

**Cards/nodes to add inside `Alpha Marketing → Discovery Map`** (add 4 cards, set titles exactly):
- `Persona Research`
- `Competitor Scan`
- `Value Proposition`
- `Launch Checklist`

**Pin groups (in `Alpha Marketing`):**
- `Priorities`
- `Ideas`

**Reminders (in `Alpha Marketing`):** keep the two defaults (`Drink Water`,
`Take a Deep Breath`) and add one custom reminder:
- Title `Stretch Break`, content `Stand up and stretch for 30 seconds.`,
  frequency `1` minute, `showOnWorkspaceOpen` = ON, `randomMode` = OFF.

**Tasks (open the Task Manager / Backlog):** add three tasks:
- `Draft launch email`
- `Book venue`
- `Review analytics`

> After creating fixtures, wait for the sync-status chip to read **synced**, then
> note the `baseRev` of `cm-proj-Alpha…` and `cm-ws-…-DiscoveryMap` from
> `window.qaSync()`. Write these baselines down; several tests compare against them.

---

## Section MT — Multi-tab detection (Part A bugs)

> Unless stated, "warning" = the amber chip in the header reading **"Open in another tab"**,
> and the popover it opens (labelled **"Data & sync"**, showing **"This device"**, the
> device name, and **"This canvas"** / **"No other tabs"**).

### MT-01 🔴 Warning must be scoped to project/workspace — different projects should NOT warn  **[BUG #1]**
**Preconditions:** Fixtures built. One browser profile (Device 1).
**Steps:**
1. In **Tab A**, open `Alpha Marketing → Discovery Map`.
2. Open **Tab B** (same browser), open `Beta Research → Literature Review`.
3. Look at the header of **both** tabs.
4. Click the amber chip in Tab A to open the **Data & sync** popover; read its text.
**Expected result:** Because the two tabs are on **different projects**, neither tab
should claim *"This canvas"* is open elsewhere. At most a neutral "open in another tab
of this app" note — never a canvas-level warning.
**Current expectation:** ❌ Both tabs show the amber "Open in another tab" warning as if
the same canvas is shared. → mark **FAIL (confirms BUG #1)**.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### MT-02 🔴 Same project + same workspace SHOULD warn
**Steps:**
1. Tab A: `Alpha Marketing → Discovery Map`.
2. Tab B: `Alpha Marketing → Discovery Map` (same workspace).
3. Read both headers and popovers.
**Expected result:** Both tabs show a clear "this exact workspace is open in another tab" warning.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### MT-03 🔴 Same project, different workspace — behaviour must be distinguishable  **[BUG #1]**
**Steps:**
1. Tab A: `Alpha Marketing → Discovery Map`.
2. Tab B: `Alpha Marketing → Campaign Plan`.
3. Read both popovers.
**Expected result:** A *project-level* notice is acceptable ("project open in another tab"),
but it must NOT say the **canvas/"This canvas"** is open elsewhere (they are different canvases).
**Current expectation:** ❌ Generic warning fires and cannot tell workspace apart. → **FAIL (confirms BUG #1)**.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### MT-04 🔴 Tab count — "open in N tabs"  **[BUG #2]**
**Steps:**
1. Open `Alpha Marketing → Discovery Map` in **four** tabs (Tab A, B, C, D).
2. Open the Data & sync popover in Tab A.
**Expected result:** It should report the count, e.g. "open in 4 tabs".
**Current expectation:** ❌ Only a yes/no warning; no number anywhere. → **FAIL (confirms BUG #2)**.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### MT-05 🟠 Closing one of three tabs must NOT clear the warning (no flicker)  **[BUG #3]**
**Steps:**
1. Open `Alpha Marketing → Discovery Map` in Tab A, Tab B, Tab C.
2. Confirm all three show the warning.
3. Close **Tab C**.
4. Watch Tab A and Tab B closely for ~10 seconds (use a stopwatch).
**Expected result:** Warning stays ON continuously on Tab A and Tab B (two tabs still open).
**Current expectation:** ❌ Warning disappears ~2s after close, then reappears ~4s later (flicker). → **FAIL (confirms BUG #3)**.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### MT-06 🟠 Page refresh must NOT flicker the warning on siblings  **[BUG #3]**
**Steps:**
1. Open `Alpha Marketing → Discovery Map` in Tab A and Tab B.
2. Press **F5** (reload) in Tab B.
3. Watch Tab A for ~10 seconds.
**Expected result:** Tab A's warning remains steadily ON.
**Current expectation:** ❌ Brief flicker off then on. → **FAIL (confirms BUG #3)**.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### MT-07 🟠 BroadcastChannel-less fallback still detects a second tab  **[BUG #4]**
**Preconditions:** Disable BroadcastChannel (Section 0.3) in **both** tabs before load.
**Steps:**
1. With `window.BroadcastChannel = undefined` set, open `Alpha Marketing → Discovery Map` in Tab A, then Tab B.
2. Wait ~8 seconds. Inspect `localStorage['thoughtflow-tab-id']` in both tabs.
3. Check whether either tab shows the multi-tab warning.
**Expected result:** Both tabs reliably detect each other.
**Current expectation:** ❌ Detection is flaky/absent because both tabs overwrite the single shared key. → **FAIL (confirms BUG #4)**.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### MT-08 🟠 Fallback cleanup on close  **[BUG #13]**
**Steps:**
1. Same fallback setup as MT-07 with Tab A + Tab B.
2. Close Tab B. Immediately read `thoughtflow-tab-id` in Tab A and watch the warning.
**Expected result:** Tab A clears (or decrements) once Tab B's entry expires; no stale id lingering wrongly.
**Current expectation:** ❌ Closed tab's id can linger up to ~10s keeping the warning ON, and no `leave` is broadcast in fallback. → note as **FAIL (confirms BUG #13)**.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### MT-09 ⚪ Single tab shows "No other tabs"
**Steps:**
1. Close all app tabs except Tab A on `Alpha Marketing → Discovery Map`.
2. Open the Data & sync popover.
**Expected result:** Popover shows **"No other tabs"** and no amber warning chip.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### MT-10 🟡 Mobile/bfcache close reliability  **[BUG #12]**
**Steps:**
1. On a mobile browser (or DevTools device emulation), open `Alpha Marketing → Discovery Map` in two tabs.
2. Background one tab and let the OS discard it (or swipe it away).
3. Observe the surviving tab's warning.
**Expected result:** Surviving tab clears promptly once the other is gone.
**Current expectation:** ❌ `beforeunload` may not fire; survivor clears only after the 10s timeout. → note as **FAIL (confirms BUG #12)**.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________


---

## Section CF — Version / conflict data-safety (Part B bugs)

> These are the most important tests: they check whether **older data can
> silently overwrite newer data**. Use `window.qaSync()` liberally to read
> `baseRev` before and after each step. The conflict banner reads
> **"A newer version of {…} exists"** with buttons **"Keep cloud · back up mine"**
> and **"Use mine · back up cloud"**.

### CF-01 🔴 Active-canvas conflict works (baseline / positive control)
**Preconditions:** Two devices (Device 1 & Device 2), both on `Alpha Marketing → Discovery Map`, both **synced**.
**Steps:**
1. On **Device 2**, edit card `Persona Research` → change its content to `EDITED ON DEVICE 2`. Wait for **synced**.
2. On **Device 1** (still showing the old copy, do NOT reload), go Network=Offline, edit card `Competitor Scan` content to `EDITED ON DEVICE 1` (Device 1 is now dirty on an old baseRev).
3. On **Device 1**, go Network=Online. Wait for the sync attempt.
**Expected result:** Device 1 shows the conflict banner **"A newer version of … exists"** for the workspace. Both copies survive (a backup is written to `cm-conflict-backups`). **No silent overwrite.**
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### CF-02 🔴 Reminders overwrite — old tab must not silently win  **[BUG #5]**
**Preconditions:** Device 1 = **Tab A** and **Tab B** in same browser, both on `Alpha Marketing → Discovery Map`, both synced. Note `baseRev` of `cm-proj-<Alpha id>` in both (call it R).
**Steps:**
1. In **Tab B**, open the Reminder panel and toggle `Drink Water` **OFF**. Wait for **synced**. In Tab B, confirm `cm-proj` baseRev is now **R+1**.
2. Do NOT touch Tab A yet. In Tab A, trigger a freshness check (switch to Tab A / focus it, or wait for the background poll). Then read Tab A's `cm-proj` baseRev with `window.qaDump('cm-proj-<Alpha id>')`.
3. In **Tab A**, open the Reminder panel — is `Drink Water` shown as OFF (Tab B's change) or still ON (stale)?
4. In **Tab A**, toggle `Take a Deep Breath` **OFF** and wait for **synced**.
5. On **Device 2** (or reload Tab B), reload the project and open Reminders.
**Expected result:** Tab B's change (`Drink Water` OFF) is preserved. Either Tab A already adopted it in step 3, OR editing in Tab A raised a **conflict** rather than silently overwriting.
**Current expectation:** ❌ Step 2 shows Tab A's baseRev advanced to R+1 but step 3 still shows `Drink Water` ON (stale). Step 4 uploads Tab A's stale reminders with **no conflict**, and step 5 shows `Drink Water` back ON — Tab B's change is **lost**. → **FAIL (confirms BUG #5)**.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### CF-03 🔴 Pin-group overwrite — same as CF-02 but for pin groups  **[BUG #5]**
**Steps:**
1. In **Tab B**, rename pin group `Ideas` to `Ideas (edited in B)`. Wait for **synced**.
2. In **Tab A**, focus the tab to trigger a freshness check. Check whether Tab A shows the rename.
3. In **Tab A**, rename pin group `Priorities` to `Priorities (edited in A)`. Wait for **synced**.
4. Reload and inspect both pin groups.
**Expected result:** Both renames survive (or a conflict was raised).
**Current expectation:** ❌ Tab B's `Ideas` rename is silently lost. → **FAIL (confirms BUG #5)**.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### CF-04 🔴 Metadata "Keep cloud" must update the UI and not revert  **[BUG #9]**
**Preconditions:** Force a metadata conflict. Easiest path: Device 2 edits reminders
(cloud meta advances); Device 1 goes offline, edits reminders (Device 1 meta dirty on old baseRev), then comes online so the meta conflict banner appears on Device 1.
**Steps:**
1. Reproduce the meta conflict on **Device 1** until the banner **"A newer version of … exists"** appears for project metadata.
2. Click **"Keep cloud · back up mine"**.
3. **Immediately** open the Reminder panel on Device 1 — do the reminders now match the **cloud** version?
4. Now toggle any reminder on Device 1, wait for **synced**, then reload.
**Expected result:** After "Keep cloud", the on-screen reminders update to the cloud copy (step 3), and the later edit (step 4) does not revert to the old local copy.
**Current expectation:** ❌ Step 3 still shows the **old local** reminders (React state not updated); step 4 re-uploads the stale local reminders, silently overwriting the cloud copy you just chose. → **FAIL (confirms BUG #9)**.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### CF-05 🔴 Null baseline must be treated as a conflict, not a free overwrite  **[BUG #6]**
**Preconditions:** Two devices on `Beta Research → Experiment Notes`, both synced. Get the workspace path `cm-ws-<Beta id>-<ExperimentNotes id>`.
**Steps:**
1. On **Device 2**, edit a card in `Experiment Notes` → wait for **synced** (cloud advances, e.g. to rev 16).
2. On **Device 1**, go Network=Offline. Use the Section 0.3 snippet to set that workspace's `baseRev = null` and `dirty = true`, then edit a card so the tab is genuinely dirty.
3. On **Device 1**, go Network=Online and let it try to upload.
**Expected result:** Device 1 raises a **conflict** (or forces a re-check) — it must NOT overwrite the cloud's newer copy.
**Current expectation:** ❌ Because `baseRev == null`, the guard is skipped and Device 1 silently overwrites the cloud (Device 2's edit lost). → **FAIL (confirms BUG #6)**.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### CF-06 🔴 Null baseline for tasks doc  **[BUG #6]**
**Steps:** Repeat CF-05 but target the tasks document `cm-tasks-<Alpha id>` (edit task `Draft launch email` on Device 2 first, then null-baseline + dirty on Device 1).
**Expected result / current expectation:** Same as CF-05 → **FAIL (confirms BUG #6)**.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### CF-07 🟠 No-op write must not bump the revision  **[BUG #11]**
**Steps:**
1. On Device 1, note `baseRev` of `cm-ws-<Alpha id>-<DiscoveryMap id>`.
2. Edit card `Value Proposition` content — add the letter `x`, then delete it (net no change). Wait for **synced**.
3. Re-read the workspace `baseRev`.
**Expected result:** `baseRev` unchanged (content identical → no upload).
**Current expectation:** ❌ Revision increments anyway, which can make other tabs believe there is newer data and trigger reloads (amplifies CF-02). → note **FAIL (confirms BUG #11)**.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### CF-08 🟡 Background tab staleness  **[BUG #7]**
**Steps:**
1. Open `Alpha Marketing → Discovery Map` in Tab A; leave it in the background (switch to another app/tab) for ~3 minutes.
2. During that time, on Device 2, make several edits to `Discovery Map` (cloud advances several revs).
3. Do NOT refocus Tab A yet — check via `window.qaSync()` (from a script, not by focusing) whether Tab A learned anything.
4. Now refocus Tab A.
**Expected result (design note):** Ideally Tab A learns it is stale promptly (e.g. via a sibling tab signal). At minimum it must catch up correctly on refocus without data loss.
**Current expectation:** ⚠️ Tab A learns nothing until refocus (accepted trade-off, but flag if combined with any silent overwrite). → note **BUG #7** behaviour.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### CF-09 🔴 Deleted workspace must not resurrect via adoption  **[BUG #14]**
**Steps:**
1. On Device 1, delete workspace `Retro Board` from `Alpha Marketing` (Workspace Manager → Delete). Confirm it disappears and a tombstone exists in `cm-tombstones`.
2. Before the tombstone reconciles to the cloud, on Device 1 trigger `reloadProjectWorkspaceList` (focus the tab / switch projects and back).
**Expected result:** `Retro Board` stays deleted (tombstone honored).
**Current expectation:** ❌ The client-side adoption path ignores tombstones, so a not-yet-reconciled server list can re-add `Retro Board`. → note **FAIL (confirms BUG #14)**.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### CF-10 ⚪ "Use mine · back up cloud" keeps both copies
**Steps:**
1. Reproduce a workspace conflict (as CF-01).
2. Click **"Use mine · back up cloud"**.
3. Inspect `cm-conflict-backups` in DevTools.
**Expected result:** Local copy becomes the live one; the cloud copy is saved into `cm-conflict-backups` (nothing is destroyed).
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### CF-11 ⚪ Conflict banner accuracy
**Steps:**
1. Trigger any conflict.
2. Read the banner text: subject noun ("workspace"/"tasks"/"project metadata"), the "edited on {device}" attribution, and the "your version is saved as a backup" reassurance.
**Expected result:** All fields are correct and match the doc that actually conflicted.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

---

## Section SL — Sync lifecycle, offline & retry

### SL-01 🟡 Sync must resume after a failed first load once online  **[BUG #8]**
**Steps:**
1. Set Network=Offline **before** loading the app.
2. Open the app on `Alpha Marketing → Discovery Map`. Initial Firestore load fails; chip should read **offline** or **local-only**.
3. Edit card `Launch Checklist` (saves locally).
4. Set Network=Online. Wait ~30–60 seconds. Do NOT reload.
**Expected result:** Sync resumes automatically — chip goes to **syncing** then **synced**, and the edit uploads.
**Current expectation:** ❌ Sync stays disabled until a manual page reload (`firestoreLoadSucceededRef` never retried). → **FAIL (confirms BUG #8)**.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### SL-02 ⚪ Retry queue drains on reconnect
**Steps:**
1. With the app loaded and synced, set Network=Offline.
2. Edit cards `Persona Research` and `Competitor Scan`. Confirm `cm-retry-queue` grows in localStorage.
3. Set Network=Online.
**Expected result:** Queue drains, chip returns to **synced**, edits appear on Device 2 after its refresh.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### SL-03 ⚪ Flush pending saves on tab close
**Steps:**
1. Edit card `Value Proposition`; immediately (within the 3s debounce) close the tab.
2. Reopen the app / check Device 2.
**Expected result:** The edit was flushed and persisted (best-effort). Note if it is lost — relates to BUG #12.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### SL-04 ⚪ Flush on project switch
**Steps:**
1. Edit card `Launch Checklist`, then immediately switch to `Beta Research`.
2. Switch back to `Alpha Marketing → Discovery Map`.
**Expected result:** Edit persisted; no data loss on the fast switch.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### SL-05 ⚪ Schema-version mismatch guard
**Preconditions:** If you can, manually bump the cloud doc's `schemaVersion` above the app's `SCHEMA_VERSION` (or use a build that does).
**Steps:**
1. Load the app against cloud data with a newer schema version.
**Expected result:** Chip shows **"Update app"** (version-mismatch); autosave uploads are **disabled** so newer-format cloud data is not corrupted. Data still displays.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### SL-06 ⚪ localStorage quota exhaustion
**Steps:**
1. Fill localStorage near quota (paste large dummy keys in Console).
2. Edit cards and toggle reminders.
**Expected result:** App degrades gracefully (catches the quota error, keeps working, no crash/white screen). Note any uncaught exceptions.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### SL-07 ⚪ Sync status chip states
**Steps:** Drive the app through each state and confirm the chip label/tooltip:
`offline`, `local-only`, `syncing`, `synced`, `error`, `version-mismatch`.
**Expected result:** Each state renders the correct chip and tooltip.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________


---

## Section WS — Workspaces (Workspace Manager)

> Open via the **Settings/gear** control → **"Workspace Manager"** (header
> **"Create, rename, and delete workspaces"**).

### WS-01 ⚪ Create with default name
**Steps:** In `Alpha Marketing`, open Workspace Manager → click **New Workspace**. Do NOT type — accept the pre-filled name.
**Expected result:** Pre-filled name is `Map Phase <n>` (n = current count + 1). Clicking **Create** adds it to the list (not auto-opened); the new row briefly highlights.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### WS-02 ⚪ Create with custom name
**Steps:** New Workspace → clear field → type `Sprint Notes` → **Create**.
**Expected result:** Workspace `Sprint Notes` appears; clicking its name switches to it and closes the modal.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### WS-03 ⚪ Empty name guard
**Steps:** New Workspace → clear field completely → **Create**.
**Expected result:** Falls back to `Map Phase <n>` — never creates a blank-named workspace.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### WS-04 ⚪ Rename
**Steps:** Hover `Sprint Notes` → pencil icon → change to `Sprint Notes v2` → Enter (or the check).
**Expected result:** Renamed; empty rename is rejected (keeps old name). Press Escape mid-rename → cancels.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### WS-05 ⚪ Duplicate
**Steps:** Hover `Discovery Map` → copy icon.
**Expected result:** A duplicate workspace appears with all `Discovery Map` cards copied; original untouched; ids are unique (run the dev workspace validator if available).
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### WS-06 ⚪ Delete requires confirm; last workspace protected
**Steps:**
1. Hover `Sprint Notes v2` → trash → confirm **Delete**.
2. Delete workspaces until only one remains, then attempt to delete the last one.
**Expected result:** Delete asks for confirm (**Delete**/**Cancel**). The **last** remaining workspace cannot be deleted (no trash affordance / no-op).
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### WS-07 ⚪ Switch active workspace
**Steps:** Click `Campaign Plan` name in the list.
**Expected result:** Modal closes; canvas shows `Campaign Plan`; the URL updates to `#/editor/<Alpha id>/<CampaignPlan id>`; **Active** badge moves.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### WS-08 ⚪ Footer count
**Steps:** Read the footer "N workspaces" while adding/removing.
**Expected result:** Count is accurate and pluralizes correctly ("1 workspace").
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### WS-09 ⚪ Workspace Manager read-only in preview mode
**Steps:** Open a `#/view/...` reference tab, open Workspace Manager.
**Expected result:** No rename/delete/duplicate/New Workspace controls (read-only). Switch/click still allowed for viewing.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

---

## Section PR — Projects

> Open via **"Projects"** / **"Switch Project"**. Actions: **Edit Project**,
> **Export Project**, **Delete Project**, **New Project**, **Set as Default Workspace**,
> **Password Protection**, **Upload Image** (Thumbnail), **Description**.

### PR-01 ⚪ Create project
**Steps:** Projects → New Project → name `Delta Sandbox`.
**Expected result:** `Delta Sandbox` created with one default workspace; becomes active.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### PR-02 ⚪ Switch project (no data bleed)
**Steps:** Switch `Alpha Marketing` → `Beta Research` → `Gamma Personal` → back.
**Expected result:** Each project shows only its own workspaces/cards/reminders/pins/tasks. No cross-project bleed.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### PR-03 ⚪ Edit project metadata
**Steps:** Projects → Edit Project on `Beta Research` → set Description `Research workstream` and upload a Thumbnail image.
**Expected result:** Description + thumbnail saved and shown in the project list; syncs.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### PR-04 ⚪ Set default workspace
**Steps:** In `Alpha Marketing`, use **Set as Default Workspace** on `Campaign Plan`.
**Expected result:** Opening `Alpha Marketing` fresh (no workspace in URL) lands on `Campaign Plan`.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### PR-05 🔴 Delete project removes all data
**Steps:** Delete `Delta Sandbox`.
**Expected result:** Its `cm-proj-`, all `cm-ws-…`, `cm-tasks-…`, snapshots, and cloud docs are removed. It no longer appears anywhere and does not resurrect after reload.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### PR-06 ⚪ Cannot delete the only/default project unexpectedly
**Steps:** Attempt to delete the default project `Alpha Marketing` while it's the only one (if applicable).
**Expected result:** Sensible guard or reassignment of default; no orphaned state.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

---

## Section PW — Password protection

### PW-01 ⚪ App-level password gate
**Steps:** Enable app password (**Password Protection**), reload.
**Expected result:** **"Password Required" / "Enter your password to access the app"** gate blocks entry until the correct password is entered; wrong password rejected.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### PW-02 🔴 Password hash never leaves the device
**Steps:** With a password set on `Beta Research`, inspect the cloud `cm-proj` document (Firestore console or network payload).
**Expected result:** The password/hash is **stripped** before upload (local-only) and re-enriched on load. It must NOT be present in Firestore.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### PW-03 ⚪ Per-project password on switch
**Steps:** Set a password on `Beta Research`; switch away and back.
**Expected result:** **"Enter password to switch project"** prompt appears; correct password unlocks; wrong password blocks.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### PW-04 ⚪ Change / clear password
**Steps:** Edit Project → set a new password (leaving field empty keeps current), then clear it.
**Expected result:** New password takes effect; empty field preserves the existing one; clearing removes protection.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

---

## Section VH — Version history / snapshots

> Open **"Version history"**. Actions per snapshot: **Preview**, **Restore**;
> manual **snapshot** button; snapshots are labelled by reason (`manual`,
> `pre-restore`, auto). Retention keeps the newest ~30.

### VH-01 ⚪ Manual snapshot
**Steps:** Version history → create a manual snapshot.
**Expected result:** A new `manual` snapshot appears at the top with a timestamp.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### VH-02 ⚪ Auto snapshot throttle
**Steps:** Make edits, wait; observe auto-snapshot creation cadence (~10 min, and only after a real sync).
**Expected result:** Auto snapshots are throttled (not one per keystroke) and only created after a successful sync.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### VH-03 ⚪ Preview writes nothing
**Steps:** Preview an older snapshot; while previewing, inspect `cm-sync-state` and confirm no new writes/dirty flags/snapshots are created.
**Expected result:** Preview is read-only; the version-preview banner is shown; leaving preview returns to live with no changes persisted.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### VH-04 ⚪ Restore creates a pre-restore snapshot
**Steps:** Note current state → Restore an older snapshot.
**Expected result:** A `pre-restore` snapshot is created first (so restore is undoable); the canvas reverts to the chosen snapshot; state is consistent.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### VH-05 🟡 Restore dirty-payload consistency  **[BUG #15]**
**Steps:** After a Restore, inspect what gets marked dirty for the metadata doc, then reload/sync.
**Expected result:** The restored metadata (including `workspaceIds`) syncs correctly with no lost fields.
**Current expectation:** ⚠️ Restore marks meta dirty with a payload missing `workspaceIds`; verify no field is dropped on the subsequent upload. → note **BUG #15** if inconsistent.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### VH-06 ⚪ Retention prune (keep newest 30)
**Steps:** Create >30 snapshots (script rapid manual snapshots if allowed).
**Expected result:** Only the newest ~30 remain; oldest are pruned.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### VH-07 ⚪ Large project snapshot
**Steps:** Build a large workspace (>1MB of cards/images) and snapshot it.
**Expected result:** Fails gracefully with a clear message if it exceeds limits; no crash.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

---

## Section RV — Reference / preview / editor-session timer

### RV-01 🔴 Reference (`/view/`) tab writes NOTHING
**Steps:**
1. Open `#/view/<Alpha id>/<DiscoveryMap id>`.
2. Confirm the read-only reference banner.
3. Try to edit (should be blocked). Inspect `cm-sync-state`, `cm-dirty-flag`, snapshots, and `cm-last-location` before/after.
**Expected result:** No dirty flag set, no push, no snapshot, no `cm-last-location` update — completely non-destructive.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### RV-02 ⚪ Editor session timer counts down and escalates
**Steps:** Enter an editor tab; watch the header pill.
**Expected result:** Starts at `05:00`; turns amber at ≤30s; turns red + shows the floating **"Redirecting to View Mode in N seconds"** popup at ≤10s.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### RV-03 ⚪ "Stay in Editor" resets timer
**Steps:** Let it reach the red popup → click **"Stay in Editor"** (or click the pill).
**Expected result:** Timer resets to `05:00`; no redirect.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### RV-04 🔴 Timer expiry redirects editor→view with NO data loss
**Steps:**
1. Edit card `Persona Research`.
2. Let the timer hit 0 without interacting.
**Expected result:** Pending save is flushed first, then the tab redirects to `#/view/...` preserving workspace/project/camera/zoom. No reload, no lost edit.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### RV-05 ⚪ Timer pauses during blocking dialog
**Steps:** Open the conflict banner (or any blocking flow) as the timer nears 0.
**Expected result:** Countdown pauses (freezes) while blocked; never redirects out from under a dialog.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### RV-06 ⚪ Backgrounded editor tab timer honesty
**Steps:** Enter editor, background the tab for >5 minutes, refocus.
**Expected result:** On refocus the timer reflects real elapsed wall-clock time (does not run 5 min longer just because it was throttled) and redirects correctly.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### RV-07 ⚪ Re-entering editor starts a fresh 5:00
**Steps:** After a redirect to view, navigate back to the editor route.
**Expected result:** A brand-new `05:00` session starts.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________


---

## Section RM — Reminders & wellness

### RM-01 ⚪ Default reminders present
**Steps:** Fresh project → open Reminder panel.
**Expected result:** `Drink Water` and `Take a Deep Breath` exist with their default icons/frequencies.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### RM-02 ⚪ Create custom reminder
**Steps:** Add `Stretch Break` (content `Stand up and stretch for 30 seconds.`, frequency `1` min, `showOnWorkspaceOpen` ON, `randomMode` OFF).
**Expected result:** Saved and listed; persists after reload.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### RM-03 ⚪ Frequency firing
**Steps:** With `Stretch Break` at 1 min, keep the workspace open ~1 min.
**Expected result:** The reminder card fires roughly on schedule; `nextReminderAt`/`lastShownAt` update.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### RM-04 ⚪ showOnWorkspaceOpen
**Steps:** Reload the workspace with `Stretch Break` `showOnWorkspaceOpen` ON.
**Expected result:** Reminder shows on open.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### RM-05 ⚪ Active hours
**Steps:** Set `Stretch Break` active hours to a window NOT covering the current time.
**Expected result:** Reminder does not fire outside its active hours.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### RM-06 ⚪ Enable/disable + delete
**Steps:** Toggle `Drink Water` off; delete `Stretch Break`.
**Expected result:** Disabled reminder stops firing; deleted reminder gone after reload.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### RM-07 ⚪ Card editor panel
**Steps:** Open the reminder Card Editor; edit title/content/icon.
**Expected result:** Changes save and render correctly (markdown where supported).
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

---

## Section PN — Pin groups

### PN-01 ⚪ Create pin group
**Steps:** Create pin groups `Priorities` and `Ideas` (if not already).
**Expected result:** Both listed; persist after reload.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### PN-02 ⚪ Add pin to a card and jump to it
**Steps:** Pin card `Value Proposition` into `Priorities`; use the pin to jump/navigate to it.
**Expected result:** Pin created; clicking it focuses/navigates to the pinned card (correct workspace + camera).
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### PN-03 ⚪ Rename / reorder / delete pin group
**Steps:** Rename `Ideas` → `Ideas Backlog`; reorder; delete a group.
**Expected result:** All operations persist and sync.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### PN-04 ⚪ Cross-workspace pin navigation
**Steps:** Pin a card in `Discovery Map`, switch to `Campaign Plan`, jump to the `Discovery Map` pin.
**Expected result:** App switches workspace and focuses the pinned card correctly.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

---

## Section TK — Tasks (Full Task Manager / Backlog)

### TK-01 ⚪ Create tasks
**Steps:** Add `Draft launch email`, `Book venue`, `Review analytics`.
**Expected result:** All appear (default in the Unassigned/Inbox area); persist after reload.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### TK-02 ⚪ Task groups & assignment
**Steps:** Create a task group `Launch`; move `Draft launch email` and `Book venue` into it.
**Expected result:** Assignment persists; sort order stable.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### TK-03 ⚪ Complete / edit / delete task
**Steps:** Mark `Review analytics` complete; edit its title; delete it.
**Expected result:** State changes persist and sync.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### TK-04 ⚪ Task linked to a pin/location
**Steps:** Link `Book venue` to the pinned `Value Proposition` (location pin).
**Expected result:** Link saved; navigating from the task focuses the correct pin/workspace; the dev validator reports no task-pin-workspace mismatch.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### TK-05 ⚪ Fullscreen vs panel task modes
**Steps:** Toggle task panel between `panel` and `fullscreen` modes.
**Expected result:** Both render correctly; no data loss switching modes.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

---

## Section TM — Countdown / focus timer

### TM-01 ⚪ Start / pause / resume
**Steps:** Start the timer; **Pause**; **Start** again.
**Expected result:** Counts correctly; pause/resume works; **Dismiss** clears it.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### TM-02 ⚪ Completion behaviour
**Steps:** Let a short timer reach 0.
**Expected result:** Audio beep plays; notification auto-dismisses; no leftover intervals (check CPU / add a console log to confirm the interval is cleared).
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### TM-03 🟡 No leaked intervals across pause/resume cycles
**Steps:** Rapidly Start/Pause/Resume ~10 times.
**Expected result:** Exactly one active interval at a time; timer value never jumps/double-counts.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

---

## Section RT — Routing & URL

### RT-01 ⚪ Editor deep link
**Steps:** Paste `#/editor/<Alpha id>/<CampaignPlan id>` into a fresh tab.
**Expected result:** Opens that exact project+workspace.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### RT-02 ⚪ View deep link
**Steps:** Paste `#/view/<Alpha id>/<DiscoveryMap id>`.
**Expected result:** Opens read-only reference view.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### RT-03 ⚪ Invalid / malformed ids
**Steps:** Try `#/editor/does-not-exist/nope` and `#/editor/%zz%`.
**Expected result:** No crash; safe fallback to a valid view; no thrown decode error.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### RT-04 ⚪ URL mirror does not trigger writes
**Steps:** Switch workspaces and watch `cm-sync-state`.
**Expected result:** URL updates mirror the active view but do NOT cause Firestore writes or dirty flags by themselves.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### RT-05 ⚪ Back / forward / refresh stability
**Steps:** Navigate across a few workspaces; use browser Back/Forward; refresh on each.
**Expected result:** Correct view restored each time; no data loss; camera/zoom sensible.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

---

## Section IM — Images

### IM-01 ⚪ Upload image to a card / project thumbnail
**Steps:** Upload an image; wait for **synced**.
**Expected result:** Permanent `src` persisted; image displays after reload.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### IM-02 🔴 Blob URLs stripped before persist
**Steps:** Upload an image, then immediately reload before the upload completes (or inspect saved JSON).
**Expected result:** Session-scoped `blob:` URLs are sanitized out; falls back to a valid `src`; no broken images after reload.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### IM-03 ⚪ Delete image / workspace image cleanup
**Steps:** Delete a card image; delete a workspace containing images.
**Expected result:** Orphaned Storage images are cleaned up; no dangling references.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### IM-04 ⚪ Restore snapshot referencing a deleted image
**Steps:** Delete the underlying Storage file, then Restore a snapshot that referenced it.
**Expected result:** Broken-image is handled gracefully (placeholder), no crash.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

---

## Section CV — Canvas / cards / nodes

### CV-01 ⚪ Add / edit / delete card
**Steps:** Add card `Temp Card`; edit title/content/theme; delete it.
**Expected result:** All operations persist; markdown renders in content.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### CV-02 ⚪ Connect / disconnect edges
**Steps:** Draw an edge between `Persona Research` and `Competitor Scan`; then remove it.
**Expected result:** Edge created/removed; edge references valid endpoints (dev validator clean).
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### CV-03 ⚪ Groups (Group Actions)
**Steps:** Group `Persona Research` + `Value Proposition`; move the group; ungroup.
**Expected result:** Group operations persist; child `workspaceId` stays consistent.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### CV-04 ⚪ Clone nodes / clone locations / portals
**Steps:** Use **Clone Nodes** / **Clone Locations**; test **Disconnect Portal**.
**Expected result:** Clones reference their source correctly; portal disconnect behaves; clone locations list is accurate.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### CV-05 ⚪ Clear Workspace
**Steps:** Use **Clear Workspace** on a throwaway workspace.
**Expected result:** Confirmation required; clears nodes/edges but keeps the workspace; undoable if supported.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### CV-06 ⚪ Undo / redo
**Steps:** Make several edits; Undo repeatedly; Redo.
**Expected result:** History is correct; `canUndo`/`canRedo` reflect reality; no phantom states.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### CV-07 ⚪ Zoom / pan / focus / MiniMap
**Steps:** Zoom in/out, focus a node, use the MiniMap to navigate.
**Expected result:** Camera behaves; MiniMap reflects the canvas; focus highlight clears after its timeout.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### CV-08 ⚪ Nodes Directory Explorer / Workspace Stats
**Steps:** Open **Nodes Directory Explorer**; read **Workspace Stats** / **Total Cards**.
**Expected result:** Counts match reality; empty state shows **"No nodes created yet"**.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

---

## Section EX — Export / Import

### EX-01 ⚪ Export project
**Steps:** Projects → **Export Project** on `Alpha Marketing`.
**Expected result:** A complete file downloads (all workspaces, tasks, reminders, pins). Note the "Don't forget to export" nudge indicator behaviour.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### EX-02 ⚪ Import full project
**Steps:** **Import** the file exported in EX-01 into a clean state.
**Expected result:** Project reconstructed accurately; dev validator reports no integrity errors.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### EX-03 ⚪ Import Partial Map
**Steps:** Use **Import Partial Map** to import a subset into an existing workspace.
**Expected result:** Nodes merge with fresh unique ids; no id collisions; validator clean.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### EX-04 ⚪ Import malformed file
**Steps:** Import a truncated/corrupt JSON file.
**Expected result:** Graceful error message; no crash; existing data untouched.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

---

## Section XC — Cross-cutting & non-functional

### XC-01 🔴 Multi-device simultaneous editing (different docs)
**Steps:** Device 1 edits `Discovery Map`; Device 2 edits `Campaign Plan` at the same time.
**Expected result:** Both save independently (per-path write queue); neither drops.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### XC-02 🟠 Rapid edit storm (debounce ceiling)
**Steps:** Type continuously in a card for >30 seconds without pausing.
**Expected result:** The 30s max-wait ceiling forces periodic saves even during nonstop editing; no lost keystrokes.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### XC-03 ⚪ Rapid tab/workspace switching
**Steps:** Switch workspaces/projects rapidly ~20 times.
**Expected result:** No stale-closure bugs (wrong project saved), no crashes, correct data each time.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### XC-04 ⚪ Console cleanliness
**Steps:** Run through Sections WS/PR/CV once with the Console open.
**Expected result:** No uncaught exceptions or React key warnings; only the intentional dev validator logs.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### XC-05 ⚪ Memory / large project
**Steps:** Create a project with many workspaces and cards; monitor memory.
**Expected result:** Only the active project's workspaces are loaded into memory; no unbounded growth.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### XC-06 ⚪ Responsive / mobile layout
**Steps:** Test at 360px, 768px, 1440px widths.
**Expected result:** Header chips, modals, panels, and canvas controls remain usable; no overflow/clipping.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

### XC-07 ⚪ Interrupted workspace delete
**Steps:** Delete a workspace, then kill the network between the doc-delete and the id-removal.
**Expected result:** A dangling workspace id is harmless; `reconcileWorkspaceIds` cleans it up; tombstone prevents resurrection.
**Result:** ☐ PASS ☐ FAIL ☐ BLOCKED — Notes: ____________________

---

## Section RG — Regression sweep (run after any fix)

- **RG-01** Re-run all 🔴 tests: MT-01, MT-02, MT-04, CF-01..CF-06, CF-09, PR-05, PW-02, RV-01, RV-04, IM-02, XC-01.
- **RG-02** Confirm no fix reintroduced a silent overwrite: re-run CF-02, CF-03, CF-04, CF-05.
- **RG-03** Confirm multi-tab warning is still accurate after presence-message changes: MT-01..MT-06, MT-09.
- **RG-04** Confirm reference/preview tabs remain fully non-destructive: RV-01, VH-03.
- **RG-05** Full smoke: create project → workspaces → cards → reminders → pins → tasks → export → import → snapshot → restore, all in one pass.

---

## Appendix A — Known-bug ↔ test-case map

| Bug | Severity | Primary test(s) |
|-----|----------|-----------------|
| 1 — Warning app-global | 🔴 | MT-01, MT-03 |
| 2 — No tab count | 🔴 | MT-04 |
| 3 — Close-one flicker | 🟠 | MT-05, MT-06 |
| 4 — Fallback shared key | 🟠 | MT-07 |
| 5 — Reminders/pins overwrite | 🔴 | CF-02, CF-03 |
| 6 — Null baseRev overwrite | 🔴 | CF-05, CF-06 |
| 7 — Background no poll | 🟡 | CF-08 |
| 8 — Sync off after failed load | 🟡 | SL-01 |
| 9 — Meta "Keep cloud" no UI update | 🔴 | CF-04 |
| 10 — Stale syncedHash on adopt | 🔴 | CF-02 (inspect `syncedHash`), CF-04 |
| 11 — No-op bumps revision | 🟠 | CF-07 |
| 12 — beforeunload unreliable | 🟠 | MT-10, SL-03 |
| 13 — Fallback stale id / no leave | 🟡 | MT-08 |
| 14 — Deleted ws resurrects via adopt | 🟡 | CF-09 |
| 15 — Restore dirty payload missing workspaceIds | 🟡 | VH-05 |

## Appendix B — Bug report template (use for any NEW bug found)
```
Title:
Severity: 🔴 / 🟠 / 🟡 / ⚪
Area: (multi-tab / conflict / sync / workspace / project / canvas / …)
Test case ID (if any):
Preconditions:
Exact steps to reproduce (numbered):
Expected result:
Actual result:
Frequency: always / intermittent (x/N)
Environment: browser + version, Firebase on/off, device
Evidence: screenshot / screen recording / console log / relevant cm-* localStorage values
```
