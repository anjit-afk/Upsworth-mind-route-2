# Data Management for a Single User on Multiple Devices and Tabs

**Who should read this:** Anyone who wants to understand how this app saves your
work, how it keeps the same project in sync across your phone, laptop, and
multiple browser tabs, and — very important — where the current design has
limits.

This document uses **simple language on purpose**. Technical names are given in
`code font` the first time, then explained in plain words.

---

## 1. The one-line summary

> Your work is saved **first on the device you are using** (instantly), and then
> **copied up to the cloud** a few seconds later. When you come back to a device
> or tab, the app checks the cloud to see if a newer version exists, and either
> quietly loads it or asks you which version to keep.

This is called a **"local-first"** design. Local-first means the app never waits
for the internet before saving — it saves to your browser immediately, then
syncs to the cloud in the background.

---

## 2. The words you need to know (plain-language glossary)

| Word | What it really means |
|------|----------------------|
| **Local storage** | A small storage box **inside your browser**, on this one device only. It is not shared with your other devices. |
| **Cloud** | The shared online database (Firestore). This is the **single source of truth** that all your devices talk to. |
| **Device** | One browser on one machine — e.g. your laptop's Chrome, or your phone's Safari. Each device has its own local storage box. |
| **Tab** | One open page of the app. You can have **many tabs of the same device** open at once, and they all share the **same** local storage box. |
| **Revision** (`revision`) | A counter on each piece of cloud data. It starts at 1 and goes **up by 1 every time that data is saved to the cloud**. Think of it as "save number 15", "save number 16", and so on. This is the "v15 / v16" idea. |
| **baseRev** | "The cloud save-number my local copy was built on." If your local data was loaded from cloud save #15, your `baseRev` is 15. |
| **dirty** | A yes/no flag meaning "I have edits on this device that are **not yet uploaded** to the cloud." |
| **Conflict** | The situation where the cloud has moved on to a **newer** save than your device knows about, **and** your device also has unsaved edits. Two versions are fighting; the app must ask you which to keep. |
| **Device label** | A friendly name for a device (e.g. "Work Laptop"). Used only to tell you *who* made a change. |

---

## 3. Where your data actually lives

### 3a. Inside your browser (local storage) — per device

Every device keeps its own copy in these named boxes:

| Storage key | What it holds |
|-------------|---------------|
| `cm-meta` | Which project is currently open, and the data format version. |
| `cm-proj-{projectId}` | One project's settings: name, description, the **list of workspaces**, reminders, pin groups, etc. |
| `cm-ws-{projectId}-{workspaceId}` | One workspace (canvas): its nodes, edges, groups, pins, images. |
| `cm-tasks-{projectId}` | The tasks and task groups for a project. |
| `cm-device` | This device's hidden id + friendly name. |
| `cm-sync-state` | The bookkeeping map: for every piece of data, its `baseRev`, `dirty` flag, and a content fingerprint. **This is the brain of sync.** |
| `cm-tombstones` | Notes about workspaces you deleted, so they don't accidentally come back. |
| `cm-conflict-backups` | Safety copies made when a conflict is resolved (so nothing is ever truly lost). |
| `cm-dirty-flag` | A short-lived marker used while the page is closing. |

**Key point:** local storage is **not shared between devices**. Your laptop and
your phone each have their own separate boxes. The only thing that connects them
is the cloud.

**Also key:** all **tabs on the same device share the same local storage box.**
This single fact is the root of most multi-tab problems (see the bug document).

### 3b. In the cloud (Firestore) — shared by all devices

The cloud stores, for each project:

- A **project document** (settings, workspace list, reminders, pin groups).
- One **document per workspace** (each canvas).
- A **tasks document**.
- A set of **dated snapshots** (version history restore points).

Every cloud document carries three bookkeeping fields:

- `revision` — the save-number (15, 16, 17...).
- `lastEditedByDevice` — the friendly name of whoever last saved it.
- `contentHash` — a fingerprint of the content, used to skip pointless saves.

---

## 4. How a save happens (step by step)

Imagine you drag a node on a canvas:

1. **Instant local save.** The change is written to `cm-ws-...` in your browser
   right away. You never lose work to a slow network.
2. **Marked "dirty".** In `cm-sync-state`, that workspace is flagged `dirty:
   true` — meaning "needs uploading."
3. **Debounced cloud save.** After a short pause (about **3 seconds** of no
   further edits), the app uploads to the cloud. The pause avoids uploading on
   every tiny movement. (There is also a maximum wait so a long, continuous edit
   still gets pushed.)
4. **Safe upload (a "transaction").** The upload is not a blind overwrite. The
   app opens a **transaction**: it reads the cloud's current `revision`, and:
   - If the cloud is still at the save-number you expected → it writes your data
     and bumps `revision` by 1 (e.g. 15 → 16), clears `dirty`, and records the
     new `baseRev`.
   - If the cloud has already moved **ahead** of your `baseRev` **and** you are
     `dirty` → it **refuses to overwrite** and raises a **conflict** instead.
5. **Fingerprint check.** If the content did not really change, the app skips the
   upload entirely so the save-number does not grow for nothing.

---

## 5. How coming back to a device or tab works

The app watches for you "returning": switching back to the tab, focusing the
window, reconnecting to the internet, or waking the computer from sleep. It also
runs a **background check on a timer**.

- **Heartbeat:** every **20 seconds** the app takes a pulse.
- **Poll:** at most every **45 seconds**, *while the tab is visible*, it asks the
  cloud "what is your current save-number?"
- **On return / focus / reconnect / wake:** it does the same check immediately.

When it checks, it compares the cloud save-number to your local `baseRev`:

- **Cloud is newer AND your copy is clean (not dirty)** → it **quietly loads**
  the cloud version and shows a small "Loaded the latest" toast. No question
  asked, because you had nothing to lose.
- **Cloud is newer AND your copy is dirty** → it shows the **conflict banner**:
  *"A newer version exists. Keep cloud (back up mine) or Use mine (back up
  cloud)."* Either way, the losing copy is saved as a backup first, so **nothing
  is ever destroyed**.

This is exactly the intended protection for your scenario: you edit in a new
tab, then return to an old tab holding an older save-number, and the app is
supposed to notice and protect you.

---

## 6. Multiple **tabs** vs multiple **devices** — the crucial difference

This distinction is the heart of everything, so read it slowly.

### Multiple devices (laptop + phone)
- **Separate** local storage boxes.
- They only meet in the cloud.
- The revision / conflict system works well here, because each device honestly
  tracks its own `baseRev` and the cloud transaction referees any clash.

### Multiple tabs of the **same** device
- **Shared** local storage box (`cm-sync-state`, `cm-ws-...`, everything).
- Two tabs editing at once are both reading and writing the **same** bookkeeping.
  One tab can quietly change the `baseRev` or `dirty` flag that the other tab is
  relying on.
- The app tries to warn you with an **"Open in another tab"** message, but as the
  bug document explains, that warning is currently very rough: it cannot tell you
  **how many** tabs, and it cannot tell whether the other tab has the **same**
  workspace open or a completely different one.

**The mental model to keep:** *the cloud is the referee between devices. But
between tabs of one device, there is no proper referee yet — they share one
notebook and can scribble over each other.*

---

## 7. Safety nets that already exist

- **Nothing is deleted on a conflict.** The losing side is copied into
  `cm-conflict-backups` before anything is overwritten.
- **Version history snapshots.** The app periodically saves full restore points
  (kept: newest ~30) so you can roll back.
- **Content fingerprints.** Identical content is never re-uploaded, so an old tab
  cannot accidentally re-stamp unchanged data as "newest".
- **Tombstones.** Deleted workspaces are prevented from silently reappearing.
- **Flush on close.** When a tab closes, it tries to push pending edits first.

---

## 8. Limitations (please keep these in mind)

These are honest limits of the **current** design. They are not all bugs — some
are deliberate trade-offs — but you should know them.

1. **This is single-user, not real-time collaboration.** It is built for *one
   person* using several devices/tabs, **not** for two people editing the same
   canvas at the same second. There is no live cursor sharing or automatic
   merging of two people's edits.

2. **Merging is per-document, not per-field.** A conflict is resolved by keeping
   *one whole version* (cloud or yours). The app does **not** merge "you moved
   node A, they moved node B" into one combined canvas. One side wins; the other
   is backed up.

3. **Tabs on one device share one storage box.** Two tabs of the same browser can
   step on each other's bookkeeping. The revision system was designed with
   *devices* in mind; tabs are only partly protected.

4. **The multi-tab warning is coarse.** Today it is a simple on/off warning. It
   does **not** count tabs and does **not** know whether the other tab is on the
   same project or workspace. (See bug document, Bugs 1–4.)

5. **Metadata (reminders, pin groups) has a weaker guard than canvases.** The
   return-check reloads the *workspace list* but does not always pull the newest
   reminders/pin-group content, which can allow an older tab to overwrite them.
   (See bug document, Bug 5.)

6. **Background tabs are not polled.** A tab sitting in the background does not
   keep checking the cloud; it only re-checks when you return to it. So the
   "another tab is ahead" knowledge can be a little stale until you switch back.

7. **Everything cloud-related needs Firebase configured and a successful first
   load.** If the app starts offline and the first cloud load fails, sync stays
   off until the page is reloaded. (See bug document, Bug 8.)

8. **Images in snapshots are stored as links, not copies.** Restoring a very old
   version after the underlying image file was deleted can show a broken image.

9. **Local storage has size limits.** Browsers cap local storage (typically a few
   MB). Extremely large projects with many images may hit that ceiling.

---

## 9. Practical advice for now (until the fixes land)

- Prefer working in **one tab at a time** per device.
- If you must use several tabs, **refresh the older tab before editing it** so it
  loads the latest cloud version first.
- Watch for the **conflict banner** and read which device made the newer change
  before choosing.
- **Export important work** occasionally as an extra backup.

---

*This document describes the design as it exists today. The companion file
`multi-tab-sync-bugs.md` lists the specific defects and the exact situations that
trigger them.*
