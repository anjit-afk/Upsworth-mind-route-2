# Multi-Tab & Sync — Detailed Bug Report

**Purpose:** describe every known defect in the multi-tab detection and the
version/conflict system so clearly that **no one can misunderstand them**.

**Read this first:** the companion document `data-management-multi-device.md`
explains the words used here (revision, baseRev, dirty, conflict, etc.). If any
term is unclear, check the glossary there.

**How to read each bug entry:**
- **What you would see** — the symptom, in plain words.
- **The exact scenario** — a numbered, reproducible story.
- **Where it is** — the file and the function/lines.
- **Why it happens** — the root cause.
- **Correct behaviour** — what it *should* do.
- **Severity** — 🔴 Critical (can lose data) · 🟠 High (wrong info / flicker) · 🟡 Medium (edge case).

**One 30-second summary of everything below:**
> The multi-tab warning is *global* — it fires for any second tab of the app,
> cannot count tabs, and cannot tell if the other tab has the same workspace
> open. Separately, the conflict system protects the active canvas well, but it
> has two holes where **older data can silently overwrite newer data**: project
> metadata (reminders/pin groups), and the case where a document's baseline was
> never recorded.

---

## Part A — Multi-tab detection bugs

All of these live in `src/App.jsx`, in the effect commented
`--- Multi-Tab Detection via BroadcastChannel ---` (around line 1843), and its
warning UI in the header (around line 6953).

---

### 🔴 BUG 1 — The multi-tab warning is app-global, not tied to a project or workspace

**What you would see:**
Open **Project A** in one tab and **Project B** in another tab of the same
browser. You still get the warning *"This canvas is currently open in another
tab"* — even though the two tabs are on completely different canvases. The
message is simply **false** in this case.

**The exact scenario:**
1. Open the app in Tab 1 and go to Project A → Workspace X.
2. Open the app in Tab 2 and go to Project B → Workspace Y.
3. Both tabs show the amber "Open in another tab" warning.
4. The warning claims *"this canvas"* is open elsewhere. It is not — the other
   tab has a different project and a different canvas.

**Where it is:**
`App.jsx`, multi-tab effect. The channel name is a single fixed string and the
message carries no identifying information:
```js
const CHANNEL_NAME = 'thoughtflow-tab-presence';   // same for every project/workspace
channel.postMessage({ type: 'presence' });          // no projectId, no workspaceId, no tabId
```

**Why it happens:**
The presence message does not include *which* project, *which* workspace, or
*which* tab sent it. So a receiving tab only learns "some other tab of this app
exists somewhere" — nothing more. It cannot possibly know if it is the same
canvas.

**Correct behaviour:**
The message must include `projectId` and `workspaceId` (and a unique `tabId`), so
a tab can decide whether the other tab is on the **same workspace**, the **same
project**, or something **unrelated** — and only warn when it actually matters.

---

### 🔴 BUG 2 — There is no tab count; "open in N tabs" is impossible

**What you would see:**
You cannot ever be told *"this project is open in 3 tabs."* The app only knows
"yes/no, another tab exists."

**The exact scenario:**
1. Open the same project in 4 tabs.
2. The app shows the same single amber warning as it would for 2 tabs.
3. There is no number anywhere.

**Where it is:**
`App.jsx`. The state is a plain boolean:
```js
setIsMultiTab(true);   // just true/false — no counting anywhere
```
Because each presence message has no per-tab id (see Bug 1), distinct tabs cannot
even be told apart to be counted.

**Why it happens:**
Counting requires (a) a unique id per tab and (b) a list/set of the ids currently
alive. Neither exists. The design stores only one true/false flag.

**Correct behaviour:**
Keep a live map of `tabId → last-seen-time` (pruned by time), and count how many
are on the same project. Then the UI can show "open in N tabs".

---

### 🟠 BUG 3 — Closing one of three-or-more tabs wrongly clears the warning

**What you would see:**
With three tabs open, close one. The warning briefly disappears on the surviving
tabs (as if you were down to a single tab), then reappears a few seconds later.
It flickers and lies for a moment. The same flicker happens on a plain page
**refresh**.

**The exact scenario:**
1. Open the same project in Tab 1, Tab 2, Tab 3.
2. Close Tab 3.
3. On tab close, Tab 3 broadcasts a `leave` message.
4. Tabs 1 and 2 receive `leave` and, after 2 seconds, set the warning to **off**
   — even though the *other* surviving tab is still open.
5. About 4 seconds later the next `presence` heartbeat arrives and the warning
   turns back **on**.

**Where it is:**
`App.jsx`, the `channel.onmessage` handler:
```js
} else if (event.data && event.data.type === 'leave') {
  if (tabTimeout) clearTimeout(tabTimeout);
  tabTimeout = setTimeout(() => setIsMultiTab(false), 2000);  // ignores other live tabs
}
```

**Why it happens:**
There is no reference counting. A single `leave` message causes an unconditional
"turn the warning off" — it does not check whether *other* tabs are still alive.

**Correct behaviour:**
With a live map of tab ids (from Bug 2's fix), removing one tab should only clear
the warning if **zero** other tabs remain.

---

### 🟠 BUG 4 — The fallback (older browsers) uses one shared key, so tabs erase each other

**What you would see:**
On a browser without `BroadcastChannel`, multi-tab detection is unreliable — it
often fails to notice a second tab at all.

**The exact scenario:**
1. Two tabs run the localStorage fallback.
2. Both write their own id into the **same** key `thoughtflow-tab-id` every 4
   seconds, each overwriting the other.
3. When a tab checks for "other tabs", it frequently reads back **its own** id
   (because it wrote last) and concludes there is no sibling.

**Where it is:**
`App.jsx`, the `catch` fallback branch:
```js
const storageKey = 'thoughtflow-tab-id';
localStorage.setItem(storageKey, JSON.stringify({ id: myId, timestamp: Date.now() }));
// every tab clobbers the same single value → last writer wins
```

**Why it happens:**
One shared key can only hold one tab's id at a time. It should hold a **map** of
all tabs' ids, each with its own timestamp.

**Correct behaviour:**
Store a map `{ [tabId]: timestamp }`, each tab updates only its own entry, and
detection counts entries whose timestamp is recent.

---

## Part B — Version / conflict bugs (data-safety)

These live mostly in `src/App.jsx` (`runFreshnessCheck`, `reloadProjectWorkspaceList`,
the heartbeat effect) and `src/persistenceService.js` (`transactionalWrite`,
`seedSyncState`).

**Good news first:** for the **active canvas**, the protection works. If you
return to an old tab that is `dirty` while the cloud has moved ahead, the upload
transaction detects it and shows the conflict banner. The bugs below are the
places where that protection has **holes**.

---

### 🔴 BUG 5 — Reminders / pin groups can be silently overwritten by an older tab

**This is the bug that most closely matches the "old tab replaces new data" fear.**

**What you would see:**
You change reminders (or pin groups) in a new tab. Later you go back to an old
tab and change a reminder there. The old tab's version wins and your newer
reminders are **gone — with no conflict popup**.

**The exact scenario (using save-numbers):**
1. Both tabs start with project metadata at cloud save **#15** (`baseRev = 15`).
2. In **Tab B**, you edit reminders. Tab B uploads → cloud metadata becomes
   **#16**. Tab B's `baseRev` is now 16.
3. **Tab A** is still sitting at `baseRev = 15`.
4. Tab A's background check notices the cloud metadata is newer (16 > 15) and it
   is not dirty, so it runs `reloadProjectWorkspaceList`.
5. **The problem:** that function only reconciles the **list of workspaces**. It
   does **not** pull Tab B's new reminders/pin groups into Tab A. But it still
   does this line, which quietly advances Tab A's baseline to 16:
   ```js
   seedSyncState(metaPath(projectId), meta.revision || 0, null);  // baseRev -> 16, content NOT adopted
   ```
6. Now Tab A believes it is up to date (baseRev 16) but is still showing the
   **old** reminders.
7. You edit a reminder in Tab A. It uploads. The transaction sees cloud #16 =
   your baseRev 16 → **no conflict** → it writes #17 with Tab A's **old**
   reminders. **Tab B's reminder changes are silently lost.**

**Where it is:**
`App.jsx` → `runFreshnessCheck` (the metadata branch, ~line 1485) calls
`reloadProjectWorkspaceList` (~line 1415), which reseeds the meta baseline while
importing only `workspaceIds`, never the reminder/pin-group fields.

**Why it happens:**
The metadata "adopt" path advances the baseline (`baseRev`) **without** adopting
the actual metadata content. Advancing the baseline tells the conflict guard
"you're caught up," which disables the very protection that would have caught the
overwrite.

**Correct behaviour:**
When adopting newer metadata, the tab must also load and apply the newest
reminders / pin groups / other meta fields into local storage **and** React
state — *before* (or instead of) advancing the baseline. If the local tab has
its own unsaved meta edits, it should raise a conflict instead of silently
reseeding.

---

### 🔴 BUG 6 — If a document has no recorded baseline, an old tab can overwrite the cloud

**What you would see:**
In rare cases (a workspace created or edited while offline, before its first
successful sync), a stale tab can overwrite newer cloud data with **no conflict
popup**.

**The exact scenario:**
1. A workspace has `baseRev = null` in `cm-sync-state` — meaning "we never
   recorded which cloud save this is based on." This can happen if the document
   was marked `dirty` before it was ever successfully seeded/synced.
2. Meanwhile the cloud copy of that workspace advances to save #16 (from another
   device/tab).
3. This tab uploads its dirty edits.
4. The upload transaction checks for a conflict with this condition:
   ```js
   if (exists && localDirty && expectedBaseRev != null && currentRev > expectedBaseRev) {
     return { status: 'conflict', ... };
   }
   ```
5. Because `expectedBaseRev` is `null`, the whole condition is **false**. No
   conflict is raised. The tab writes save #17 and **overwrites the cloud's #16**.

**Where it is:**
`persistenceService.js` → `transactionalWrite` (~line 774). The guard requires
`expectedBaseRev != null`, so a null baseline **skips** the guard entirely.

**Why it happens:**
`getSyncState` returns `baseRev: null` by default when a path has never been
seeded. The guard treats "unknown baseline" as "safe to overwrite," which is the
opposite of safe.

**Correct behaviour:**
When a document is `dirty` but has no known baseline (`baseRev == null`) and the
cloud document already exists with a real revision, that should be treated as a
**conflict** (or at least a forced re-check), not a free overwrite.

---

### 🟡 BUG 7 — Background tabs never poll, so their "freshness" can be stale

**What you would see:**
A tab left in the background does not keep learning about cloud changes. It only
catches up when you switch back to it.

**The exact scenario:**
1. Leave Tab A in the background for several minutes.
2. Edit heavily in Tab B (cloud advances several save-numbers).
3. Tab A learns nothing during that time — its background timer skips the poll.
4. Tab A only re-checks when you return to it (focus / visibility change).

**Where it is:**
`App.jsx`, heartbeat effect (~line 1699):
```js
if (now - lastPoll >= POLL_MS && document.visibilityState === 'visible') {
  runFreshnessCheck('poll');   // gated on the tab being visible
}
```

**Why it happens:**
The poll is intentionally limited to visible tabs to save CPU/battery. The
return-check does cover most cases, but combined with Bug 1 (the warning is not
version-aware anyway), a background tab has no early awareness that it has fallen
behind.

**Correct behaviour (design choice):**
This is a reasonable trade-off, but a better design would let tabs on the same
device tell each other "I just advanced to save #16" over the tab channel, so a
background tab can mark itself stale **immediately** rather than waiting to be
re-focused. This is also what would enable the "show the conflict as soon as
possible" behaviour that was requested.

---

### 🟡 BUG 8 — Sync stays off after a failed first load

**What you would see:**
If the app opens while offline and its first cloud load fails, cloud sync and
freshness checks stay disabled until you reload the page — even after the
internet comes back.

**The exact scenario:**
1. Open the app with no connection; the initial Firestore load fails.
2. Connection returns a minute later.
3. Editing still saves locally, but nothing uploads and no freshness checks run,
   because the app gated them behind "did the first load succeed?".

**Where it is:**
`App.jsx` → both `runFreshnessCheck` and `pushDirtyNow` start with:
```js
if (!isFirebaseConfigured() || !firestoreLoadSucceededRef.current) return;
```

**Why it happens:**
`firestoreLoadSucceededRef` is set once, at initial load. If that failed, it is
never retried without a page reload.

**Correct behaviour:**
On regaining connectivity (`online` event), attempt the initial load again and,
if it succeeds, flip the flag so sync resumes without a manual reload.

---

## Part C — Summary table

| # | Severity | Area | One-line description |
|---|----------|------|----------------------|
| 1 | 🔴 | Multi-tab | Warning is app-global; fires even for unrelated projects/workspaces. |
| 2 | 🔴 | Multi-tab | No tab counting — "open in N tabs" is impossible. |
| 3 | 🟠 | Multi-tab | Closing one of 3+ tabs wrongly clears the warning (flicker/lie). |
| 4 | 🟠 | Multi-tab | Fallback uses one shared key; tabs overwrite each other's id. |
| 5 | 🔴 | Conflict | Reminders/pin groups: old tab silently overwrites newer cloud data. |
| 6 | 🔴 | Conflict | `baseRev == null` skips the conflict guard → silent overwrite. |
| 7 | 🟡 | Conflict | Background tabs never poll; staleness not detected until refocus. |
| 8 | 🟡 | Conflict | Sync stays off after a failed first load until page reload. |

---

## Part D — What "fixed" would look like (for reference, not implemented yet)

1. **Scoped presence messages.** Each tab announces `{ tabId, projectId,
   workspaceId, baseRev }` on the shared channel. From this the app can show:
   - *"This project is open in N tabs."*
   - *"This exact workspace is open in another tab."*
   - Nothing at all when the other tab is on an unrelated project.
   (Fixes Bugs 1, 2, 3; and Bug 4 by storing a map in the fallback.)

2. **Adopt metadata content, not just the workspace list**, before advancing the
   metadata baseline; raise a conflict if the local tab has its own meta edits.
   (Fixes Bug 5.)

3. **Treat a dirty document with an unknown baseline as a conflict** when the
   cloud copy already exists. (Fixes Bug 6.)

4. **Let sibling tabs report their latest save-number** so a background/old tab
   can flag a conflict immediately instead of waiting for the 45-second cloud
   poll. (Addresses Bug 7 and the "show the conflict ASAP" goal.)

5. **Retry the initial load on reconnect.** (Fixes Bug 8.)

---

*This report describes defects only. No code has been changed. See
`data-management-multi-device.md` for how the system is meant to work and its
overall limitations.*
