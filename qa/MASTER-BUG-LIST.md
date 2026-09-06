# MASTER BUG LIST — Everything We Know Is Broken (Single Source of Truth)

This one document lists **every bug** found so far, from all reviews combined:
1. The original multi-tab & sync report (`multi-tab-sync-bugs`) — Bugs **1–8**.
2. Extra findings from the code review of that same area — Bugs **9–15**.
3. The fresh canvas/cards/metadata review — Bugs **C1–C5**.

**Total: 20 bugs.**

---

## How to read this document (please read once)

Each bug is written in the exact same shape so nothing is ambiguous:

- **ID & title** — a stable name to refer to the bug by.
- **Severity** — how bad it is (see legend).
- **Area** — which part of the app.
- **Status** — Confirmed = we verified it directly in the source code.
- **What you would see** — the symptom, in plain everyday words.
- **Step-by-step scenario** — a numbered story anyone can follow to hit the bug.
- **Where it is (in the code)** — the file and the function/line, for developers.
- **Why it happens** — the underlying cause.
- **What should happen instead** — the correct behaviour.
- **Related bugs** — other bugs that make this one worse or are connected.

### Severity legend
| Symbol | Meaning |
|--------|---------|
| 🔴 **Critical** | Can **lose or corrupt data**, or make things unusable. Fix first. |
| 🟠 **High** | Shows **wrong information**, flickers, or creates junk/churn. |
| 🟡 **Medium** | Edge case, hygiene, or only in unusual conditions. |

### Plain-word glossary (so no term is confusing)
- **Card (also "node")** — a note/box on the board. It has a hidden **ID** (a name the app uses internally to tell cards apart).
- **Connection (also "edge")** — a line linking two cards. The app stores it as "from card-ID X to card-ID Y".
- **Workspace** — one board/canvas. A project can have many workspaces.
- **Project** — a folder that holds workspaces plus settings (reminders, pins, etc.).
- **Metadata** — the project's settings document (reminders, pin groups, the card-ID counter, the list of workspaces). It is saved **separately** from the cards.
- **Sync / syncing** — saving your work to the internet so other devices/tabs see it.
- **Tab** — one page in your browser. You can open the same app in several tabs.
- **Revision / save-number** — a counter the cloud bumps by 1 every time a document is saved. Used to tell "who is newer".
- **baseRev (baseline)** — the save-number a tab *thinks* it started from. Used to detect if someone else saved in the meantime.
- **Dirty** — "has unsaved changes not yet confirmed on the cloud".
- **Conflict** — the app noticing two competing versions and (ideally) asking you which to keep instead of silently picking one.
- **Clone** — a linked copy of a card; editing one can update the others.
- **Reference / read-only view** — a "look but don't touch" mode (URLs starting with `/view/`).

---

## MASTER SUMMARY TABLE (all 20 at a glance)

| # | Severity | Area | One-line description |
|---|----------|------|----------------------|
| 1 | 🔴 | Multi-tab | The "open in another tab" warning is app-wide; it fires even for **unrelated projects/workspaces**. |
| 2 | 🔴 | Multi-tab | There is **no tab count**; "open in N tabs" is impossible. |
| 3 | 🟠 | Multi-tab | Closing one of 3+ tabs **wrongly clears** the warning for a few seconds (flicker/lie). |
| 4 | 🟠 | Multi-tab | Old-browser fallback uses **one shared key**, so tabs erase each other's presence. |
| 5 | 🔴 | Sync/Conflict | **Reminders / pin groups** can be **silently overwritten** by an older tab (no popup). |
| 6 | 🔴 | Sync/Conflict | If a document has **no recorded baseline**, an old tab can silently overwrite newer cloud data. |
| 7 | 🟡 | Sync/Conflict | **Background tabs never poll**, so they can stay stale until refocused. |
| 8 | 🟡 | Sync/Conflict | **Sync stays off after a failed first load** until the page is reloaded. |
| 9 | 🔴 | Sync/Conflict | Resolving a **metadata** conflict with "Keep cloud" **doesn't update the screen** and can silently re-overwrite the cloud. |
| 10 | 🔴 | Sync/Conflict | Adopting new metadata keeps a **stale content-fingerprint**, defeating no-op detection. |
| 11 | 🟠 | Sync/Conflict | A **no-op save still bumps the revision**, making other tabs think there's newer data. |
| 12 | 🟠 | Multi-tab/Sync | Tab-close hook (`beforeunload`) is **unreliable**; "leave" signal and final save can be skipped. |
| 13 | 🟡 | Multi-tab | Old-browser fallback leaves a **stale tab id** behind and never says "leave". |
| 14 | 🟡 | Sync/Conflict | A **deleted workspace can reappear** by being re-adopted from the server (ignores tombstones). |
| 15 | 🟡 | Sync/Conflict | Restore marks metadata dirty with a **payload missing the workspace list**. |
| C1 | 🔴 | Cards / IDs | A **new card can reuse an existing card's ID** → cards merge/stack, share connections, become undeletable. |
| C2 | 🟠 | Clones | Deleting a card leaves **orphaned clones** (pointing at a deleted card) in other workspaces. |
| C3 | 🟠 | Reminders/Sync | Reminder **timing data is saved into synced metadata** → constant needless cloud writes + more conflict churn. |
| C4 | 🟡 | Validation | The integrity checker **can't detect duplicate IDs** and only runs in development. |
| C5 | 🟡 | Editor UI | The Card Editor shows **stale text** when the open card is changed elsewhere. |

> **Two headline data-loss clusters:** (a) Bugs **5, 6, 9, 10** = older data silently
> replacing newer data during sync. (b) Bug **C1** = duplicate card IDs corrupting
> the board. Bugs **C3** and **11** make cluster (a) fire more often. Fix these first.

---
---

# PART A — Multi-tab detection

All of Part A lives in `src/App.jsx`, in the effect commented
`--- Multi-Tab Detection via BroadcastChannel ---` (around line **1850**) and the
warning UI in the header (around line **7037**).

---

## 🔴 Bug 1 — The "open in another tab" warning is app-wide, not tied to a project or workspace
**Severity:** 🔴 Critical (wrong/misleading info) · **Area:** Multi-tab · **Status:** Confirmed

**What you would see:**
You open **Project A** in one tab and a **completely different Project B** in
another tab. Both tabs still show the warning *"this canvas is open in another
tab."* That statement is simply **false** — the two tabs are on different boards.

**Step-by-step scenario:**
1. In Tab 1, open Project A → workspace "Discovery Map".
2. In Tab 2, open Project B → workspace "Literature Review".
3. Both tabs show the amber "Open in another tab" warning.
4. The warning claims *this* canvas is open elsewhere. It is not.

**Where it is (in the code):**
`App.jsx`, the multi-tab effect. The channel name is one fixed string and the
message carries no identifying details:
```js
const CHANNEL_NAME = 'thoughtflow-tab-presence';   // same for every project/workspace  (App.jsx:1855)
channel.postMessage({ type: 'presence' });          // no projectId, workspaceId, or tabId (App.jsx:~1877)
```

**Why it happens:**
The presence message doesn't say *which* project, *which* workspace, or *which*
tab sent it. A receiving tab only learns "some other tab of this app exists" —
nothing more — so it cannot know whether it's the same board.

**What should happen instead:**
The message must include `projectId`, `workspaceId`, and a unique `tabId`, so a
tab can decide whether the other tab is on the **same workspace**, the **same
project**, or something **unrelated**, and warn only when it truly matters.

**Related bugs:** 2, 3, 4, 12, 13 (all stem from the same design gap).

---

## 🔴 Bug 2 — There is no tab count ("open in N tabs" is impossible)
**Severity:** 🔴 Critical (missing capability) · **Area:** Multi-tab · **Status:** Confirmed

**What you would see:**
The app can never tell you *"this project is open in 3 tabs."* It only knows
yes/no that *some* other tab exists.

**Step-by-step scenario:**
1. Open the same project in 4 tabs.
2. Every tab shows the same single warning it would show for 2 tabs.
3. There is no number anywhere.

**Where it is (in the code):**
`App.jsx`. The state is a plain true/false:
```js
const [isMultiTab, setIsMultiTab] = useState(false);  // App.jsx:688
setIsMultiTab(true);                                  // App.jsx:1864 — no counting
```

**Why it happens:**
Counting needs (a) a unique id per tab and (b) a list of the ids currently alive.
Neither exists; the design stores only one flag.

**What should happen instead:**
Keep a live map of `tabId → last-seen-time` (pruned by time) and count how many
are on the same project, so the UI can show "open in N tabs".

**Related bugs:** 1, 3.

---

## 🟠 Bug 3 — Closing one of three-or-more tabs wrongly clears the warning (flicker)
**Severity:** 🟠 High · **Area:** Multi-tab · **Status:** Confirmed

**What you would see:**
With three tabs open, close one. On the surviving tabs the warning briefly
disappears (as if only one tab were left), then reappears a few seconds later. It
"lies" for a moment. The same flicker happens on a plain page refresh.

**Step-by-step scenario:**
1. Open the same project in Tab 1, Tab 2, Tab 3.
2. Close Tab 3 → it broadcasts a `leave` message.
3. Tabs 1 and 2 receive `leave` and, after 2 seconds, turn the warning **off** —
   even though the other tab is still open.
4. About 4 seconds later the next heartbeat arrives and the warning turns back **on**.

**Where it is (in the code):**
`App.jsx`, the `channel.onmessage` handler (around **1868**):
```js
} else if (event.data && event.data.type === 'leave') {
  if (tabTimeout) clearTimeout(tabTimeout);
  tabTimeout = setTimeout(() => setIsMultiTab(false), 2000);  // ignores other live tabs
}
```

**Why it happens:**
There is no reference counting. A single `leave` unconditionally turns the
warning off; it never checks whether other tabs are still alive.

**What should happen instead:**
With a live map of tab ids (Bug 2's fix), removing one tab should clear the
warning only when **zero** other tabs remain.

**Related bugs:** 1, 2, 12.

---

## 🟠 Bug 4 — The old-browser fallback uses one shared key, so tabs erase each other
**Severity:** 🟠 High · **Area:** Multi-tab · **Status:** Confirmed

**What you would see:**
On a browser without `BroadcastChannel`, multi-tab detection is unreliable — it
often fails to notice a second tab at all.

**Step-by-step scenario:**
1. Two tabs run the localStorage fallback.
2. Both write their own id into the **same** key `thoughtflow-tab-id` every few
   seconds, each overwriting the other.
3. When a tab checks for "other tabs", it usually reads back **its own** id and
   concludes there is no sibling.

**Where it is (in the code):**
`App.jsx`, the `catch` fallback branch (around **1900–1920**):
```js
const storageKey = 'thoughtflow-tab-id';
localStorage.setItem(storageKey, JSON.stringify({ id: myId, timestamp: Date.now() }));
// every tab clobbers the same single value → last writer wins
```

**Why it happens:**
One shared key can only hold one tab's id at a time. It should hold a **map** of
all tabs' ids, each with its own timestamp.

**What should happen instead:**
Store a map `{ [tabId]: timestamp }`; each tab updates only its own entry;
detection counts entries whose timestamp is recent.

**Related bugs:** 13.

---
---

# PART B — Version / conflict & sync data-safety

These live in `src/App.jsx` (`runFreshnessCheck` ~1465, `reloadProjectWorkspaceList`
~1423, `resolveConflict` ~1742, the heartbeat/poll effect ~1690, `pushDirtyNow`
~1506) and `src/persistenceService.js` (`transactionalWrite` ~774, `seedSyncState`).

**Good news:** for the **active board you're looking at**, the protection works —
returning to a stale, dirty tab while the cloud moved ahead correctly shows a
conflict box. The bugs below are the **holes** in that protection.

---

## 🔴 Bug 5 — Reminders / pin groups can be silently overwritten by an older tab
**Severity:** 🔴 Critical (silent data loss) · **Area:** Sync/Conflict · **Status:** Confirmed

**What you would see:**
You change reminders (or pin groups) in a newer tab. Later you go back to an
older tab and change a reminder there. The old tab wins and your newer reminders
are **gone — with no conflict popup.**

**Step-by-step scenario (using save-numbers):**
1. Both tabs start with project metadata at save **#15** (`baseRev = 15`).
2. In **Tab B**, edit reminders → cloud metadata becomes **#16**; Tab B's baseline is now 16.
3. **Tab A** is still at baseline 15.
4. Tab A's background check sees the cloud is newer (16 > 15) and it isn't dirty,
   so it runs `reloadProjectWorkspaceList`.
5. **The problem:** that function reconciles only the **list of workspaces**. It
   does **not** pull Tab B's new reminders/pin groups into Tab A. Yet it still
   advances Tab A's baseline to 16:
   ```js
   seedSyncState(metaPath(projectId), meta.revision || 0, null);  // baseline → 16, content NOT adopted
   ```
6. Tab A now believes it's up to date (baseline 16) but still shows the **old** reminders.
7. You edit a reminder in Tab A → it uploads. The check sees cloud #16 = baseline
   16 → **no conflict** → it writes #17 with Tab A's **old** reminders. **Tab B's
   reminder changes are silently lost.**

**Where it is (in the code):**
`App.jsx` → `runFreshnessCheck` metadata branch (~**1485**) → `reloadProjectWorkspaceList`
(~**1423**), which reseeds the metadata baseline while importing only `workspaceIds`.

**Why it happens:**
The "adopt metadata" path advances the baseline **without** adopting the actual
metadata content. Advancing the baseline tells the guard "you're caught up",
disabling the very protection that would have caught the overwrite.

**What should happen instead:**
When adopting newer metadata, also load and apply the newest reminders / pin
groups / other fields into local storage **and** the on-screen state — *before*
(or instead of) advancing the baseline. If the local tab has its own unsaved
metadata edits, raise a conflict instead of silently reseeding.

**Related bugs:** 6, 9, 10 (same data-loss cluster); C1 (metadata revert can also break card IDs); C3 (makes this fire more often).

---

## 🔴 Bug 6 — If a document has no recorded baseline, an old tab can overwrite the cloud
**Severity:** 🔴 Critical (silent data loss) · **Area:** Sync/Conflict · **Status:** Confirmed

**What you would see:**
In rare cases (a workspace created/edited before its first successful sync), a
stale tab can overwrite newer cloud data with **no conflict popup.**

**Step-by-step scenario:**
1. A workspace has `baseRev = null` ("we never recorded which cloud save this is
   based on"). This happens if it was marked dirty before ever being synced.
2. Meanwhile the cloud copy advances to save #16 (from another device/tab).
3. This tab uploads its dirty edits.
4. The upload's conflict check is:
   ```js
   if (exists && localDirty && expectedBaseRev != null && currentRev > expectedBaseRev) {
     return { status: 'conflict', ... };
   }   // persistenceService.js:~786
   ```
5. Because `expectedBaseRev` is `null`, the whole condition is **false** → no
   conflict → the tab writes #17 and **overwrites the cloud's #16.**

**Where it is (in the code):**
`persistenceService.js` → `transactionalWrite` (~**774**). The guard requires
`expectedBaseRev != null`, so an unknown baseline **skips** the guard.

**Why it happens:**
`getSyncState` returns `baseRev: null` by default when a path was never seeded.
The guard treats "unknown baseline" as "safe to overwrite" — the opposite of safe.

**What should happen instead:**
When a document is dirty but has no known baseline (`baseRev == null`) **and** the
cloud document already exists with a real revision, treat that as a **conflict**
(or force a re-check), not a free overwrite.

**Related bugs:** 5, 9, 10; C1.

---

## 🟡 Bug 7 — Background tabs never poll, so their "freshness" can be stale
**Severity:** 🟡 Medium · **Area:** Sync/Conflict · **Status:** Confirmed

**What you would see:**
A tab left in the background stops learning about cloud changes; it only catches
up when you switch back to it.

**Step-by-step scenario:**
1. Leave Tab A in the background for several minutes.
2. Edit heavily in Tab B (cloud advances several save-numbers).
3. Tab A learns nothing during that time.
4. Tab A re-checks only when you return to it (focus / visibility change).

**Where it is (in the code):**
`App.jsx`, heartbeat effect (~**1699/1809**):
```js
if (now - lastPoll >= POLL_MS && document.visibilityState === 'visible') {
  runFreshnessCheck('poll');   // only when the tab is visible
}
```

**Why it happens:**
The poll is deliberately limited to visible tabs to save battery. The
return-to-tab check covers most cases, but combined with Bug 1 (the warning isn't
version-aware) a background tab has no early awareness it fell behind.

**What should happen instead (design choice):**
Reasonable trade-off, but ideally same-device tabs should tell each other "I just
advanced to save #16" over the tab channel, so a background tab can mark itself
stale immediately and show a conflict as soon as possible.

**Related bugs:** 1, 12.

---

## 🟡 Bug 8 — Sync stays off after a failed first load
**Severity:** 🟡 Medium · **Area:** Sync/Conflict · **Status:** Confirmed

**What you would see:**
If the app opens while offline and its first cloud load fails, cloud sync and
freshness checks stay disabled until you reload the page — even after the internet
comes back.

**Step-by-step scenario:**
1. Open the app with no connection; the initial cloud load fails.
2. Connection returns a minute later.
3. Editing still saves locally, but nothing uploads and no freshness checks run.

**Where it is (in the code):**
`App.jsx` → both `runFreshnessCheck` (**1466/1467**) and `pushDirtyNow`
(**1506/1507**) start with:
```js
if (!isFirebaseConfigured() || !firestoreLoadSucceededRef.current) return;
```
The flag is set once at initial load (**1060**) and never retried without a reload.

**Why it happens:**
`firestoreLoadSucceededRef` is set only during the initial load. If that failed,
nothing flips it back on later.

**What should happen instead:**
On regaining connectivity (the `online` event), retry the initial load and, if it
succeeds, flip the flag so sync resumes without a manual reload.

---

## 🔴 Bug 9 — Resolving a metadata conflict with "Keep cloud" doesn't update the screen, and the stale screen re-overwrites the cloud
**Severity:** 🔴 Critical (silent data loss inside the safety net) · **Area:** Sync/Conflict · **Status:** Confirmed

**What you would see:**
A conflict box appears for reminders/pin groups. You click **"Keep cloud · back up
mine"**. The screen keeps showing your **old** reminders. Later, your old list
quietly comes back and overwrites the cloud copy you just chose to keep.

**Step-by-step scenario:**
1. Force a metadata conflict so the box "A newer version … exists" appears.
2. Click **"Keep cloud · back up mine"**.
3. Open the Reminder panel — it still shows the OLD local reminders.
4. Edit any reminder → it uploads → the stale local reminders overwrite the cloud.

**Where it is (in the code):**
`App.jsx` → `resolveConflict`, the `kind === 'meta'` branch (~**1742**+). It writes
merged metadata to local storage and reseeds the baseline, but — unlike the
`tasks` branch right above it, which calls `setTasks`/`setTaskGroups` — it **never
calls `setReminders` / `setPinGroups` / `setNextId`.** So the on-screen state stays
old. The metadata autosave (watches `[nextId, reminders, pinGroups]`) then sees
old-state vs newly-saved-metadata as "changed" and re-uploads the old values.

**Why it happens:**
The metadata resolution updates storage but forgets to refresh the React
(on-screen) state, so the UI and storage disagree and the UI wins on the next save.

**What should happen instead:**
After choosing "Keep cloud" for metadata, update the on-screen reminders / pin
groups / counter to match the adopted cloud copy (mirror what the tasks branch does).

**Related bugs:** 5, 6, 10 (same cluster).

---

## 🔴 Bug 10 — Adopting new metadata keeps a stale content-fingerprint
**Severity:** 🔴 Critical (weakens overwrite protection) · **Area:** Sync/Conflict · **Status:** Confirmed

**What you would see:**
No direct symptom by itself; it quietly makes Bugs 5 and 9 worse by leaving the
app's "did anything really change?" fingerprint out of date.

**Step-by-step scenario (conceptual):**
1. The app stores, per document, a baseline save-number **and** a `syncedHash`
   (a fingerprint of the content that was last synced).
2. When adopting newer metadata, the code calls `seedSyncState(path, newRev, null)`
   with content = `null`.
3. Because content is `null`, the fingerprint is **kept from before**:
   ```js
   syncedHash: content ? computeContentHash(content) : (map[path] ? map[path].syncedHash : null)
   ```
4. Now the baseline says "#16" but the fingerprint describes the content of "#15".
   Any later logic that trusts the fingerprint is working from a mismatched pair.

**Where it is (in the code):**
`persistenceService.js` → `seedSyncState`; called with `null` content from
`reloadProjectWorkspaceList` (~**1447**) and the metadata conflict branch (~**1742**+).

**Why it happens:**
Passing `null` as the content means "don't recompute the fingerprint", so the
baseline and the fingerprint fall out of step.

**What should happen instead:**
When adopting content, recompute the fingerprint from the newly adopted content
so the baseline and fingerprint always describe the same version.

**Related bugs:** 5, 9.

---

## 🟠 Bug 11 — A no-op save still bumps the revision
**Severity:** 🟠 High · **Area:** Sync/Conflict · **Status:** Confirmed

**What you would see:**
Making a change and then undoing it (net: nothing changed) still counts as a new
cloud save. Other tabs then think there's newer data and reload — widening the
window for the silent-overwrite bugs.

**Step-by-step scenario:**
1. Note a workspace's save-number.
2. Type a letter into a card and delete it (net change: none). Wait for "synced".
3. The save-number went up anyway.

**Where it is (in the code):**
`persistenceService.js` → `transactionalWrite` (~**770–799**). It always does
`newRev = currentRev + 1` and never compares the incoming content fingerprint
against the server's to skip an identical write. (A skip optimization exists in
`manualServerSync` but not in the normal autosave path.)

**Why it happens:**
The content fingerprint (`syncedHash`) that could detect "nothing actually
changed" is not consulted before writing.

**What should happen instead:**
If the new content's fingerprint equals what's already on the server, skip the
write (don't bump the revision).

**Related bugs:** 5, 6 (this makes them fire more often); C3.

---

## 🟠 Bug 12 — Tab-close hook is unreliable; "leave" signal and final save can be skipped
**Severity:** 🟠 High · **Area:** Multi-tab / Sync · **Status:** Confirmed

**What you would see:**
On mobile browsers (or when a tab is discarded), closing a tab may not tell the
other tabs it left (extra flicker), and a last-moment save may not finish.

**Step-by-step scenario:**
1. Open the same board in two tabs on a mobile browser.
2. Close/background one tab so the OS discards it.
3. The surviving tab doesn't get a "leave" message and only clears after a ~10s timeout.

**Where it is (in the code):**
`App.jsx`, multi-tab `handleBeforeUnload` (~**1881**) and the dirty-flag flush
effect (~**1955**). Both rely on `beforeunload`, which does not fire reliably on
mobile Safari/Chrome or under bfcache. The final `flushPendingServerSaves().then(...)`
inside `beforeunload` is also not awaited — the tab can be killed first.

**Why it happens:**
`beforeunload` is a best-effort event; on many platforms it simply doesn't run.

**What should happen instead:**
Also use `visibilitychange → hidden` (which is far more reliable) to broadcast
"leave" and to trigger the final save.

**Related bugs:** 3, 13.

---

## 🟡 Bug 13 — Old-browser fallback leaves a stale tab id and never says "leave"
**Severity:** 🟡 Medium · **Area:** Multi-tab · **Status:** Confirmed

**What you would see:**
On browsers using the fallback, a closed tab's presence lingers for up to ~10
seconds, keeping the warning up on the survivor.

**Step-by-step scenario:**
1. Two tabs use the fallback (no `BroadcastChannel`).
2. Close one tab.
3. The survivor keeps warning until the closed tab's timestamp expires.

**Where it is (in the code):**
`App.jsx`, fallback cleanup (~**1926–1930**): it only clears its interval and
listener; it never removes its own id from `thoughtflow-tab-id` and never
broadcasts a "leave".

**Why it happens:**
The fallback has no explicit cleanup of its own presence entry.

**What should happen instead:**
On close, remove this tab's own entry from the presence map (part of Bug 4's fix).

**Related bugs:** 4, 12.

---

## 🟡 Bug 14 — A deleted workspace can reappear by being re-adopted from the server
**Severity:** 🟡 Medium · **Area:** Sync/Conflict · **Status:** Confirmed

**What you would see:**
You delete a workspace; in a rare timing window it comes back.

**Step-by-step scenario:**
1. Delete workspace "Retro Board". A "tombstone" (a deleted-marker) is recorded.
2. Before that tombstone reconciles to the cloud, the app runs
   `reloadProjectWorkspaceList` (e.g. you refocus the tab).
3. The server's workspace list still contains "Retro Board", so it gets re-added.

**Where it is (in the code):**
`App.jsx` → `reloadProjectWorkspaceList` (~**1423**). It filters server ids by
`!localIds.includes(id) && !isDirty(...)` but does **not** check
`hasTombstone(projectId, id)`. (The lower-level `reconcileWorkspaceIds` *does*
honor tombstones, but this client-side adoption path does not.)

**Why it happens:**
The adoption path forgot to consult the deleted-markers before re-adding.

**What should happen instead:**
Skip any server workspace id that has a tombstone.

**Related bugs:** none directly.

---

## 🟡 Bug 15 — Restore marks metadata dirty with a payload missing the workspace list
**Severity:** 🟡 Medium · **Area:** Sync/Conflict · **Status:** Confirmed

**What you would see:**
Usually nothing visible, but the "dirty fingerprint" written during a restore
doesn't represent the full document, which is a correctness smell in a data-restore
path.

**Step-by-step scenario:**
1. Restore an older snapshot.
2. The code marks metadata dirty with `{ nextId, reminders, pinGroups }` but the
   actual saved metadata also includes `workspaceIds`.

**Where it is (in the code):**
`App.jsx` → `restoreSnapshot` (~**1578**):
```js
markDirty(metaPath(projectId), { nextId, reminders, pinGroups });  // missing workspaceIds
```
Elsewhere (workspace management, ~**2074**) the dirty payload *does* include
`workspaceIds`, so this is inconsistent.

**Why it happens:**
The dirty payload for restore was assembled by hand and omitted a field.

**What should happen instead:**
Include `workspaceIds` (and any other persisted fields) in the dirty payload so
the fingerprint matches the document actually written.

**Related bugs:** none directly.

---
---

# PART C — Canvas / cards, clones, reminder-sync & validation

These live mostly in `src/App.jsx` (card create/delete/clone paths, reminder
engine, metadata autosave), `src/workspaceValidator.js`, and
`src/CardEditorPanel.jsx`.

---

## 🔴 Bug C1 — A new card can be born with an ID that already exists (duplicate card IDs)
**Severity:** 🔴 Critical (data corruption) · **Area:** Cards / IDs · **Status:** Confirmed
**(This is the bug a user reported: a new card "attaches" to an old one, they stack, and can't be deleted.)**

**What you would see:**
You add a new card. An existing card suddenly appears "stuck" to it — one above,
one below — the old card keeps its previous connections, the two act like one
unit, and **you cannot delete them** (deleting does nothing, or removes the wrong
one, or removes both).

**Step-by-step scenario:**
1. A workspace already has cards with internal IDs `10`, `11`, `12`.
2. The project's card-ID counter (`nextId`) is at `10` instead of `13` (see "How
   the counter falls behind" below).
3. You click **Add** (or press **N**, or paste, or clone).
4. The new card is created with `id = "10"` — the same ID an existing card has.
5. Two cards now share ID `10`. Everything keyed by ID collides:
   - **Connections:** a connection stores its ends as card-IDs, so the old card's
     existing line now also points at the new card → they look connected.
   - **Stacking / identity:** the app draws cards keyed by ID; two cards with the
     same key render on top of / next to each other (the "one up, one down" stack).
   - **Deletion:** delete works purely by ID, so removing ID `10` hits **both**
     cards (or one reappears on re-render) → feels undeletable.

**Where it is (in the code):**
Every create path assigns `id: nextId.toString()` then just `setNextId(prev => prev + 1)`,
with **no check against existing IDs**:
- `addNode` — `App.jsx:5663`
- `cloneNode` — `App.jsx:6027`
- `cloneNodeToWorkspace` — `App.jsx:6065`
- single-card paste — `App.jsx:2619`
- group paste — `App.jsx:2773`
- multi-card paste — `App.jsx:3067`
- multi-card duplicate — `App.jsx:~9019`
Deletion that then misbehaves: `deleteNode` — `App.jsx:6165` (`ws.nodes.filter(n => n.id !== id)`).

**Why it happens (root cause):**
1. **The counter lives apart from the cards it protects.** Card IDs come from
   `nextId`, but `nextId` is stored in the **project metadata document**, while
   the cards live in the **workspace document** — saved and synced separately, so
   they can drift apart.
2. **Nothing reconciles the counter against the cards that exist.** A repo-wide
   search finds no code setting `nextId = max(existing card IDs) + 1` (the only
   `Math.max` over cards is on their x-position, `App.jsx:4938`). So whenever
   `nextId` ≤ an existing card's numeric ID, the next card collides.

**How the counter falls behind (all real paths):**
- **Missing value → low default.** On load it becomes `proj.nextId || 10`
  (`App.jsx:1239, 1588, 1625, 4090, 4180, 4511, 4827`) or, worse,
  **`proj.nextId || 1`** which is then *written back to metadata*
  (`App.jsx:1035, 1171, 4799`).
- **The sync bugs can revert it.** Because the counter is part of metadata, Bug 5
  and Bug 6 can roll it **backwards** while the cards keep their higher IDs —
  guaranteeing a collision on the next new card.

**What should happen instead:**
Make card IDs collision-proof, either by:
1. minting them with the app's existing unique-ID generator (like `g-…`, `pin-…`,
   `img-…` already use), or
2. setting `nextId = max(all existing numeric card IDs across the project) + 1` on
   every load / import / hydrate / project-switch, and re-checking inside each
   create path.
Never write `nextId: … || 1` back to storage.

**Related bugs:** 5 and 6 (they can trigger C1 by reverting the counter); C4 (the
validator can't catch the resulting duplicates).

---

## 🟠 Bug C2 — Deleting a card orphans its clones in other workspaces
**Severity:** 🟠 High · **Area:** Clones · **Status:** Confirmed

**What you would see:**
You delete an original card. Its clones in *other* workspaces stay behind but go
"dead": editing them updates nothing, and the Clone Locations list may point at a
source that no longer exists.

**Step-by-step scenario:**
1. In "Discovery Map", create a card and use **Clone to Tab…** to clone it into
   "Campaign Plan". The clone remembers `cloneSourceId = <original card ID>`.
2. Return to "Discovery Map" and delete the original card.
3. Open "Campaign Plan": the clone is still there, still tagged as a clone, but
   its source no longer exists.

**Where it is (in the code):**
`deleteNode` — `App.jsx:6161–6172`. It runs through `updateActiveWorkspace`, so it
only touches the **currently open** workspace:
```js
const filteredNodes = ws.nodes.filter(n => n.id !== id)
  .map(n => n.cloneSourceId === id ? { ...n, cloneSourceId: null } : n);
```
The `cloneSourceId` cleanup is applied only to the active workspace.

**Why it happens:**
Clone links span workspaces, but the delete cleanup is single-workspace.

**What should happen instead:**
On delete, reconcile clone links **across all workspaces** (like `updateNode`'s
cross-workspace pass): clear `cloneSourceId` on every clone of the deleted card,
or promote one clone to be the new source.

**Related bugs:** none directly.

---

## 🟠 Bug C3 — Reminder timing data is written into synced metadata, causing constant needless cloud writes
**Severity:** 🟠 High · **Area:** Reminders / Sync · **Status:** Confirmed

**What you would see:**
Even when you touch nothing, the app keeps saving to the cloud — on every open and
about once a minute — just from reminders ticking. On multiple devices this shows
as near-constant "syncing" and extra conflict churn, and it makes the
silent-overwrite bugs fire more often.

**Step-by-step scenario:**
1. Open a project → the reminder engine stamps a `nextReminderAt` timestamp onto
   every enabled reminder → that counts as a change → uploaded.
2. Every 60 seconds and every time a reminder fires, `lastShownAt`/`nextReminderAt`
   are rewritten → more uploads, more revision bumps.
3. With two devices open, both keep bumping the same metadata revision from clock
   ticking (not real edits), so each keeps seeing the other as "newer".

**Where it is (in the code):**
- Reminder engine writes runtime timestamps into `reminders` state:
  `App.jsx:3476–3480` (init) and `App.jsx:3516` (on fire).
- Metadata autosave treats any change to `reminders` as a user change:
  `App.jsx:2224–2243` (`JSON.stringify(projMeta.reminders) !== JSON.stringify(reminders)`
  → `markDirty(metaPath…)`).

**Why it happens:**
Ephemeral scheduling values (`nextReminderAt`, `lastShownAt`) are kept in the same
array as the user's real reminder settings, and the sync layer can't tell them
apart, so it uploads the throwaway timestamps.

**What should happen instead:**
Keep reminder scheduling state out of synced metadata (a local-only store or a
ref), or strip those fields before comparing/persisting. Only real setting changes
(title, content, frequency, enabled, active hours) should upload.

**Related bugs:** 5, 6, 11 (this amplifies all of them).

---

## 🟡 Bug C4 — The integrity checker can't detect duplicate IDs, and only runs in development
**Severity:** 🟡 Medium · **Area:** Validation · **Status:** Confirmed

**What you would see:**
Nothing — which is the problem. The duplicate-ID corruption from C1 passes the
built-in checker unnoticed.

**Where it is (in the code):**
`workspaceValidator.js`. It checks `workspaceId` consistency and that every
connection points at an existing object, but it builds its ID set with
`objectIds.add(node.id)` **without ever detecting a duplicate**. It's also invoked
only under `import.meta.env.DEV`, so production builds never validate.

**Why it happens:**
The validator was built for reference integrity, not uniqueness, and scoped to dev.

**What should happen instead:**
Add a duplicate-ID check (per workspace, ideally project-wide) for cards, groups,
pins, and images; run a lightweight version after risky operations (import,
restore, paste, cross-device adopt) even in production, and warn or auto-repair.

**Related bugs:** C1.

---

## 🟡 Bug C5 — The Card Editor shows stale text when the open card is changed elsewhere
**Severity:** 🟡 Medium · **Area:** Editor UI · **Status:** Confirmed

**What you would see:**
You have a card open in the editor. The same card (or its clone) is updated by
another action, but the editor keeps showing the old text until you close and
reopen it.

**Where it is (in the code):**
`CardEditorPanel.jsx:31–42`. The effect that copies the card's title/content/theme
into the editor depends only on the card **ID**:
```js
useEffect(() => { … setTitle(selectedNode.title || '') … }, [selectedNode?.id]);
```
So when the card's *content* changes but its *ID* stays the same, the editor
fields aren't refreshed.

**Why it happens:**
The sync effect keys only on `selectedNode?.id`, ignoring changes to the card's
own fields while it stays selected.

**What should happen instead:**
Also react to the relevant fields (title/content/theme) while avoiding clobbering
the user's in-progress typing (reconcile only when the incoming value differs from
what the user last committed).

**Related bugs:** C1 (both are node-identity issues).

---
---

# Cross-links between bugs (how they make each other worse)

- **Data-loss cluster (fix together): 5, 6, 9, 10.** All four are ways newer data
  gets silently replaced by older data during sync.
- **11 and C3 pour fuel on the fire.** They cause extra, meaningless cloud saves,
  which bump revisions, which makes tabs think there's newer data, which triggers
  the reconciliation paths where 5/6/9/10 lose data.
- **C1 is linked to 5 & 6.** The card-ID counter lives in metadata; when 5/6 revert
  metadata, the counter can roll back and cause duplicate card IDs (C1).
- **Multi-tab family: 1 → 2 → 3, plus 4/13 (fallback) and 12 (unreliable close).**
  They all trace back to presence messages carrying no identity and no per-tab id.

---

# Recommended fix order

1. **🔴 C1** — duplicate card IDs (live user report; corrupts the board). Make IDs
   collision-proof and reconcile the counter on load/import/hydrate.
2. **🔴 5, 6, 9, 10** — the silent-overwrite cluster. Adopt content (not just the
   baseline), treat unknown baselines as conflicts, refresh on-screen state after
   "Keep cloud", and keep the fingerprint in step.
3. **🟠 11 + C3** — stop meaningless cloud writes (skip no-op saves; keep reminder
   timing out of synced metadata). Cheap wins that shrink the data-loss window.
4. **🔴/🟠 1, 2, 3, 4, 12, 13** — the multi-tab rework: scoped presence messages
   with a per-tab id + a live tab map + reliable close handling.
5. **🟠 C2** — reconcile clone links across workspaces on delete.
6. **🟡 7, 8, 14, 15, C4, C5** — remaining edge cases and hygiene.

---

# How to reproduce the two most dangerous bugs (quick reference)

**Bug 5 (reminders silently lost) — two devices, no tools:**
1. Both devices open the same project, wait for "synced".
2. Device 2: turn a reminder OFF, wait for "synced".
3. Device 1 (don't refresh): turn a *different* reminder OFF, wait for "synced".
4. Refresh both. **Fail =** Device 2's change came back ON (its change was lost).

**Bug C1 (duplicate card IDs) — direct, guaranteed (developer console):**
1. Open a workspace that already has several cards.
2. Console: lower the stored counter below an existing ID and reload:
   ```js
   const m = JSON.parse(localStorage.getItem('cm-proj-<projectId>'));
   m.nextId = 10;                       // an ID that already exists
   localStorage.setItem('cm-proj-<projectId>', JSON.stringify(m));
   ```
3. Click **Add**. **Fail =** the new card collides with an existing card (stacks,
   shares connections, resists deletion).

---

*This master list documents defects only; no application code has been changed.
It consolidates `multi-tab-sync-bugs`, the follow-up sync review, and
`BUG-REPORT-canvas-cards-and-metadata.md`. For testing, see `QA-TEST-PLAN.md`
(technical) and `QA-TEST-PLAN-SIMPLE.md` (plain-language).*
