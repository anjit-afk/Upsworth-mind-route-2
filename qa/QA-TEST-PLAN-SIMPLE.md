# App Testing Guide — For Everyone (No Experience Needed)

Welcome! This guide asks you to test an app that helps people organize ideas on
a "board." **You do not need to know anything about computers, coding, or this
app.** Just follow each step exactly, then tell us what happened.

Think of yourself as a normal person using the app for the first time. If
something feels broken, confusing, or surprising — that's exactly what we want
to know.

---

## How to use this guide

1. Do the **"Get ready"** part first. It sets up a few things so the later tests
   are easy.
2. Then go through the tests **in order**, from top to bottom.
3. Each test tells you:
   - **Do this** — the exact buttons to click.
   - **You should see** — what is supposed to happen.
   - **Passed or failed?** — a simple way to decide.
4. After each test, write your answer in the little box:
   - ✅ **Passed** — it worked as described.
   - ❌ **Failed** — it did not work as described (this is a helpful finding!).
   - ⏭️ **Skipped** — you couldn't do it (say why).
5. If a test **fails**, please also:
   - Take a screenshot (press the **Print Screen** key, or on a phone press the
     screenshot buttons).
   - Write down what you *expected* vs what *actually* happened.

**There are no wrong answers.** Reporting a failure is a success for us.

---

## A few simple words we use

You'll see these words in the guide. Here's what they mean in plain English:

- **The app** — the website you are testing. Open it in your web browser (like
  Chrome, Edge, Safari, or Firefox) using the web address your team gave you.
- **Project** — a big folder. Everything you make lives inside a project. You can
  have several projects (for example, one for work and one for home).
- **Workspace** — a single board/canvas inside a project. One project can have
  many workspaces. (In the app, look for the word "Workspace.")
- **Card** — a small note/box you place on a workspace. It has a title and some text.
- **Reminder** — a friendly pop-up that reminds you to do something (like "Drink Water").
- **Pin** — a bookmark that lets you jump straight to a card.
- **Task** — a to-do item in the app's to-do list.
- **Saving to the cloud (also called "syncing")** — the app quietly saves your
  work to the internet so it shows up on your other devices. Look for a small
  status label near the top that says things like **"synced"** (saved) or
  **"syncing"** (saving right now).
- **Tab** — one page inside your browser. You can open the same app in two tabs
  at once (like having two copies of the same window).
- **Read-only view** — a "look but don't touch" version. You can see the board
  but not change it.

---

## Get ready (do this once, before any test)

### G-1. Open the app
1. Open your web browser.
2. Go to the web address your team gave you.
3. If it asks for a password, type the password you were given and continue.

**You should see:** the app opens and shows a board with some cards, or an empty
board. There should be no error message.

✅ Passed  ❌ Failed  — Notes: ____________________

### G-2. Learn where the important buttons are
Spend two minutes hovering your mouse over the buttons near the top and sides of
the screen. When you hover, a small label (a "tooltip") often appears telling you
what a button does. You're just getting familiar — you don't need to click yet.

Look for buttons/labels named: **Projects**, **Switch Project**, **Add**,
**Version history**, **Import**, and a small status label like **synced**.

✅ I found them  ❌ I couldn't find some — Notes (which ones?): ____________________

### G-3. Create the things we'll test with (please use these exact names)
Using the app's buttons, create the following. Don't worry about *how* yet — the
tests below explain the buttons. For now, just know these names are what we'll
reuse everywhere, so **please type them exactly as written**.

**Create 3 projects** (use the **Projects** / **New Project** button):
- `Alpha Marketing`
- `Beta Research`
- `Gamma Personal`

**Inside `Alpha Marketing`, create 3 workspaces** (use the Workspace tool —
usually a settings/gear or a "Workspace" button — then look for **New Workspace**):
- `Discovery Map`
- `Campaign Plan`
- `Retro Board`

**Inside `Beta Research`, create 2 workspaces:**
- `Literature Review`
- `Experiment Notes`

**Inside `Gamma Personal`, create 1 workspace:**
- `Home Ideas`

**Inside `Alpha Marketing → Discovery Map`, add 4 cards** (use the **Add** button)
and give them these titles:
- `Persona Research`
- `Competitor Scan`
- `Value Proposition`
- `Launch Checklist`

> Tip: Don't worry if this feels slow. You only set this up once. If you get
> stuck creating any of these, that itself is worth reporting as a finding.

✅ Done  ❌ Got stuck (say where): ____________________

### G-4. What "two devices" means (you'll need this for a few tests)
Some tests ask you to use **two devices** at the same time. You have easy options —
pick whichever is simplest for you:
- **Easiest:** open a second **private/incognito window** of your browser
  (in Chrome/Edge: menu → "New Incognito/InPrivate window"). Treat that window as
  **Device 2**, and your normal window as **Device 1**.
- Or use a **different browser** (e.g., Chrome as Device 1, Firefox as Device 2).
- Or use a **phone or a second computer** as Device 2.

In all cases, open the same app and log in the same way on both.

✅ I know how to open a second device  ❌ Not sure — Notes: ____________________

### G-5. How to "go offline" and "come back online"
A few tests ask you to disconnect from the internet. The simplest way:
- **Go offline:** turn off Wi‑Fi, or switch on **Airplane mode**.
- **Come back online:** turn Wi‑Fi back on, or turn off Airplane mode.

✅ I know how  ❌ Not sure — Notes: ____________________


---

# Part 1 — The basics work (projects, workspaces, cards)

### Test 1 — Switch between projects
**Do this:**
1. Click **Projects** (or **Switch Project**) near the top.
2. Click `Alpha Marketing`.
3. Open **Projects** again and click `Beta Research`.
4. Do it once more and open `Gamma Personal`.

**You should see:** Each time, the board changes to show only that project's own
workspaces and cards. `Beta Research` should NOT show cards from `Alpha Marketing`.

**Passed or failed?**
- ✅ Passed if each project shows only its own stuff.
- ❌ Failed if you see cards or workspaces from a different project mixed in.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 2 — Create a new project
**Do this:**
1. Open **Projects** → click **New Project**.
2. Name it `Delta Sandbox` and confirm.

**You should see:** `Delta Sandbox` is created and becomes the one you're looking at.

- ✅ Passed if the new project appears and opens.
- ❌ Failed if nothing happens, it errors, or the name is wrong.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 3 — Create a workspace
**Do this:**
1. Make sure you're in `Alpha Marketing`.
2. Open the Workspace tool (a gear/settings or "Workspace" button) → click **New Workspace**.
3. Clear any pre-filled name, type `Sprint Notes`, and click **Create**.

**You should see:** `Sprint Notes` appears in the list of workspaces.

- ✅ Passed if `Sprint Notes` appears.
- ❌ Failed if it doesn't appear or you get an error.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 4 — Rename a workspace
**Do this:**
1. In the workspace list, hover over `Sprint Notes`.
2. Click the pencil (edit) icon, change the name to `Sprint Notes v2`, and press Enter.

**You should see:** The name changes to `Sprint Notes v2`.

- ✅ Passed if renamed.
- ❌ Failed if the name doesn't change.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 5 — You cannot delete the very last workspace
**Do this:**
1. Delete workspaces (hover → trash icon → confirm) until only ONE is left.
2. Try to delete that last one.

**You should see:** The app refuses to delete the final workspace (there's no
delete option, or it stops you). A project should always keep at least one workspace.

- ✅ Passed if you cannot delete the last workspace.
- ❌ Failed if you end up with zero workspaces.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________
> After this test, re-create the workspaces you deleted so later tests still work:
> `Discovery Map`, `Campaign Plan`, `Retro Board` (in `Alpha Marketing`).

### Test 6 — Add a card
**Do this:**
1. Open `Alpha Marketing → Discovery Map`.
2. Click **Add** to create a card. Give it the title `Temp Card`.

**You should see:** A new card named `Temp Card` appears on the board.

- ✅ Passed if the card appears.
- ❌ Failed if nothing appears.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 7 — Edit a card and check it's remembered
**Do this:**
1. Click the `Temp Card` to edit it. Change its text to `Hello testing`.
2. Wait about 10 seconds (watch for the **synced** label near the top).
3. Refresh the page (press **F5**, or the reload button).

**You should see:** After the refresh, `Temp Card` still says `Hello testing`.

- ✅ Passed if your text is still there after refreshing.
- ❌ Failed if your text disappears or reverts.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 8 — Delete a card
**Do this:**
1. Select `Temp Card`, find its delete option (look for **Card Actions** or a trash icon), and delete it.
2. Refresh the page.

**You should see:** `Temp Card` is gone and stays gone after refresh.

- ✅ Passed if it's deleted permanently.
- ❌ Failed if it comes back after refresh.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 9 — Connect two cards with a line
**Do this:**
1. On `Discovery Map`, draw a connecting line between `Persona Research` and
   `Competitor Scan` (drag from the edge of one card to the other).
2. Then remove that line.

**You should see:** The line appears when connected and disappears when removed.

- ✅ Passed if you can connect and disconnect cards.
- ❌ Failed if lines won't connect, won't delete, or connect to the wrong card.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 10 — Move around the board (zoom and mini-map)
**Do this:**
1. Zoom in and out (use the zoom buttons or your mouse wheel).
2. Drag the empty board to move around.
3. Use the small overview map (mini-map) in a corner to jump somewhere.

**You should see:** Smooth zooming and moving. The mini-map matches what's on the board.

- ✅ Passed if navigation feels normal.
- ❌ Failed if it's jumpy, frozen, or the mini-map is wrong.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 11 — Undo and redo
**Do this:**
1. Add a card called `Undo Me`.
2. Press the Undo button (or Ctrl+Z).
3. Press Redo (or Ctrl+Y / Ctrl+Shift+Z).

**You should see:** Undo removes `Undo Me`; Redo brings it back.

- ✅ Passed if undo/redo behave correctly.
- ❌ Failed if they do nothing or the wrong thing.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________
> Clean up: delete `Undo Me` when done.

---

# Part 2 — Reminders

### Test 12 — The starter reminders exist
**Do this:** Open the Reminders panel (look for a reminders/bell button).

**You should see:** Two ready-made reminders already there: `Drink Water` and
`Take a Deep Breath`.

- ✅ Passed if both are listed.
- ❌ Failed if they're missing.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 13 — Create your own reminder
**Do this:**
1. In the Reminders panel, add a new reminder.
2. Title: `Stretch Break`. Message: `Stand up and stretch for 30 seconds.`
3. Set it to remind every `1` minute, and turn ON "show when I open the workspace."
4. Save.

**You should see:** `Stretch Break` appears in the list. Refresh the page — it's still there.

- ✅ Passed if it's saved and survives a refresh.
- ❌ Failed if it isn't saved.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 14 — A reminder actually pops up
**Do this:** Keep `Alpha Marketing → Discovery Map` open and wait about 1 minute
(the `Stretch Break` reminder is set to 1 minute).

**You should see:** The `Stretch Break` reminder pops up around the 1-minute mark.

- ✅ Passed if it appears roughly on time.
- ❌ Failed if it never appears, or spams you constantly.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 15 — Turn a reminder off
**Do this:** Switch `Drink Water` OFF. Wait and watch.

**You should see:** `Drink Water` stops popping up.

- ✅ Passed if a switched-off reminder stays quiet.
- ❌ Failed if it still pops up.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 16 — Delete a reminder
**Do this:** Delete `Stretch Break`. Refresh the page.

**You should see:** `Stretch Break` is gone and stays gone.

- ✅ Passed if it's removed permanently.
- ❌ Failed if it reappears.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

---

# Part 3 — Pins (bookmarks to cards)

### Test 17 — Create pin groups
**Do this:** In the Pins panel, create two pin groups named `Priorities` and `Ideas`.

**You should see:** Both groups appear. Refresh — they're still there.

- ✅ Passed if both are saved.
- ❌ Failed if not.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 18 — Pin a card and jump to it
**Do this:**
1. Pin the card `Value Proposition` into the `Priorities` group.
2. Move somewhere else on the board, then click that pin.

**You should see:** The app jumps straight to `Value Proposition`.

- ✅ Passed if clicking the pin takes you to the right card.
- ❌ Failed if it goes nowhere or to the wrong card.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 19 — Jump to a pin in a different workspace
**Do this:**
1. Stay in `Alpha Marketing`. Switch to the `Campaign Plan` workspace.
2. Open the pin you made for `Value Proposition` (which lives in `Discovery Map`) and click it.

**You should see:** The app switches back to `Discovery Map` and highlights `Value Proposition`.

- ✅ Passed if it switches workspace and finds the card.
- ❌ Failed if it fails to switch or can't find the card.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 20 — Rename and delete a pin group
**Do this:** Rename `Ideas` to `Ideas Backlog`. Then delete it. Refresh.

**You should see:** The rename sticks; after deleting, the group is gone for good.

- ✅ Passed if both work and survive a refresh.
- ❌ Failed if not.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________


---

# Part 4 — Tasks (the to-do list)

### Test 21 — Add tasks
**Do this:** Open the task list (look for **Backlog**, tasks, or a checklist button).
Add three tasks: `Draft launch email`, `Book venue`, `Review analytics`.

**You should see:** All three appear in the list. Refresh — still there.

- ✅ Passed if all three are saved.
- ❌ Failed if any go missing.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 22 — Group and organize tasks
**Do this:** Create a task group called `Launch`. Move `Draft launch email` and
`Book venue` into it.

**You should see:** Both tasks now sit under `Launch`, and stay there after a refresh.

- ✅ Passed if grouping sticks.
- ❌ Failed if tasks jump out or the group is lost.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 23 — Complete, edit, and delete a task
**Do this:** Mark `Review analytics` as done. Then rename it to `Review analytics (Q3)`.
Then delete it. Refresh after each step.

**You should see:** Each change is remembered.

- ✅ Passed if complete/edit/delete all work and survive refresh.
- ❌ Failed if any change is lost.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 24 — Big view vs small view of the task list
**Do this:** If there's a full-screen option for the task list, switch to it and back.

**You should see:** The list looks right in both sizes, and nothing is lost switching.

- ✅ Passed if both views work.
- ❌ Failed if switching loses data or breaks the layout.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

---

# Part 5 — The focus timer

### Test 25 — Start, pause, and dismiss the timer
**Do this:** Find the countdown/focus timer. Click **Start**. Then **Pause**. Then start again. Then **Dismiss**.

**You should see:** It counts down, pausing stops the count, starting resumes it, and dismiss clears it.

- ✅ Passed if all controls behave.
- ❌ Failed if the number jumps around, doesn't stop, or won't dismiss.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 26 — Timer finishes
**Do this:** Set a short timer and let it reach zero.

**You should see:** A gentle sound/alert when it finishes, and the alert goes away
on its own after a moment.

- ✅ Passed if it alerts you and then clears.
- ❌ Failed if there's no alert, or it never stops.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

---

# Part 6 — Saving and the internet (very important)

> These tests check that your work is safe even with internet hiccups.

### Test 27 — Normal saving works
**Do this:** Edit the card `Launch Checklist` (add the word `checked`). Watch the
status label near the top.

**You should see:** It briefly shows **syncing** (saving) and then **synced** (saved).

- ✅ Passed if it reaches **synced**.
- ❌ Failed if it stays stuck or shows an error.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 28 — Editing while offline, then coming back
**Do this:**
1. Go offline (turn off Wi‑Fi / Airplane mode ON — see "Get ready" G-5).
2. Edit `Persona Research` (add the word `offline`).
3. Wait a moment — the app should still let you type and keep your change on screen.
4. Come back online.
5. Wait up to about a minute.

**You should see:** After reconnecting, the status returns to **synced** on its own,
without you needing to refresh the page. Your `offline` edit is kept.

- ✅ Passed if it saves automatically after reconnecting.
- ❌ Failed if it stays stuck as offline/not-saved until you manually refresh the page.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 29 — Open the app while offline from the start
**Do this:**
1. Close the app tab completely.
2. Go offline FIRST.
3. Now open the app.
4. Edit `Campaign Plan` (add the word `note`).
5. Come back online and wait up to a minute.

**You should see:** Once the internet is back, the app should start saving your
changes on its own (status becomes **synced**), even though it opened with no internet.

- ✅ Passed if saving starts working after the internet returns.
- ❌ Failed if nothing saves until you refresh the page.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 30 — Close the tab right after editing
**Do this:** Edit `Value Proposition` (add `quick`), then **immediately** close the
tab (within a second or two). Reopen the app.

**You should see:** Your `quick` edit was saved.

- ✅ Passed if the edit is there when you reopen.
- ❌ Failed if the edit is lost.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

---

# Part 7 — Using the app in two tabs at once

> A "tab" is one page in your browser. Here you open the SAME app in two tabs of
> the SAME browser window. The app is supposed to warn you when the same board is
> open in more than one tab, so you don't accidentally clash with yourself.

### Test 31 — Warning shows when the SAME board is open twice
**Do this:**
1. In Tab 1, open `Alpha Marketing → Discovery Map`.
2. Open a second tab (Tab 2) and open the very same `Alpha Marketing → Discovery Map`.
3. Look near the top of both tabs.

**You should see:** A small amber/yellow notice like **"Open in another tab"**
appears, warning you the same board is open elsewhere.

- ✅ Passed if both tabs show the warning.
- ❌ Failed if there's no warning at all.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 32 — No false warning for DIFFERENT projects
**Do this:**
1. In Tab 1, open `Alpha Marketing → Discovery Map`.
2. In Tab 2, open a completely different project: `Beta Research → Literature Review`.
3. Read the notice near the top. If it's clickable, click it to read the details
   (look for words like **"This canvas"**).

**You should see:** Since the two tabs are on totally different projects, the app
should NOT claim the *same board* is open in another tab. A gentle "app is open
elsewhere" hint is okay, but it should not say *this* board/canvas is open twice.

- ✅ Passed if it does NOT falsely warn that this board is open elsewhere.
- ❌ Failed if it warns you as if the same board is open twice (it isn't).

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 33 — Can it tell you HOW MANY tabs?
**Do this:** Open `Alpha Marketing → Discovery Map` in FOUR tabs. Open the notice
details in one of them.

**You should see:** Ideally it tells you a number, like "open in 4 tabs."

- ✅ Passed if it shows an accurate count.
- ❌ Failed if it can only say "open somewhere" with no number.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 34 — Closing one of three tabs shouldn't flicker the warning
**Do this:**
1. Open `Alpha Marketing → Discovery Map` in three tabs.
2. Close the third tab.
3. Watch the other two tabs closely for about 10 seconds.

**You should see:** Because two tabs are still open, the warning should stay ON
the whole time — steady, no blinking off and on.

- ✅ Passed if the warning stays steadily ON.
- ❌ Failed if the warning briefly disappears and then comes back (a flicker).

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 35 — Refreshing one tab shouldn't flicker the other
**Do this:** Open the same board in two tabs. Refresh (F5) one tab. Watch the other.

**You should see:** The other tab's warning stays steady (no blinking).

- ✅ Passed if it stays steady.
- ❌ Failed if it flickers off then on.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 36 — "No other tabs" when only one is open
**Do this:** Close all app tabs except one. Open the notice details in that one.

**You should see:** It says something like **"No other tabs"**, and there's no warning.

- ✅ Passed if a single tab shows no warning.
- ❌ Failed if it still warns you when nothing else is open.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________


---

# Part 8 — When the same thing is changed in two places (the most important safety tests)

> Here you use **two devices** (see "Get ready" G-4 — the easiest is a normal
> window as **Device 1** and a private/incognito window as **Device 2**). We're
> checking that the app never quietly throws away someone's work.

### Test 37 — The app warns you instead of overwriting (main safety check)
**Do this:**
1. On **both** Device 1 and Device 2, open `Alpha Marketing → Discovery Map` and
   wait until both show **synced**.
2. On **Device 2**: change the card `Persona Research` text to `EDITED ON DEVICE 2`.
   Wait until it says **synced**.
3. On **Device 1** (do NOT refresh it): first go offline (Airplane mode ON), then
   change the card `Competitor Scan` text to `EDITED ON DEVICE 1`.
4. On **Device 1**: come back online and wait a moment.

**You should see:** On Device 1, a message box appears saying something like
**"A newer version … exists"**, offering choices such as **"Keep cloud · back up
mine"** and **"Use mine · back up cloud"**. This means the app noticed both changes
and is asking you what to do — instead of silently losing one.

- ✅ Passed if Device 1 shows that choice box (nothing is silently lost).
- ❌ Failed if no box appears and one of the two changes silently vanishes.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 38 — Reminders changed in two places (watch for silent loss)
**Do this:**
1. On both devices, open `Alpha Marketing` and wait for **synced**.
2. On **Device 2**: open Reminders and turn `Drink Water` **OFF**. Wait for **synced**.
3. On **Device 1** (don't refresh): open Reminders. Does it show `Drink Water`
   already OFF (good), or still ON (out of date)?
4. On **Device 1**: turn `Take a Deep Breath` **OFF** too. Wait for **synced**.
5. On **Device 2**: refresh and open Reminders.

**You should see:** BOTH changes survive — `Drink Water` stays OFF (Device 2's
change) AND `Take a Deep Breath` is OFF (Device 1's change). Or, the app shows you
a choice box in step 4.

- ✅ Passed if no reminder change is silently lost.
- ❌ Failed if `Drink Water` turns back ON on its own — meaning Device 1 quietly
  wiped out Device 2's change with no warning.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 39 — Pin groups changed in two places
**Do this:**
1. On **Device 2**: rename the pin group `Priorities` to `Priorities-2`. Wait for **synced**.
2. On **Device 1** (don't refresh): rename pin group `Ideas` (or any group) to `Ideas-1`. Wait for **synced**.
3. Refresh both devices and compare.

**You should see:** Both renames survive (or a choice box appeared).

- ✅ Passed if neither rename is silently lost.
- ❌ Failed if one rename disappears with no warning.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 40 — Choosing "Keep cloud" actually updates what you see
**Do this:**
1. Make a reminder-conflict box appear on Device 1 (repeat Test 38's steps until
   the choice box shows for reminders).
2. Click **"Keep cloud · back up mine"**.
3. Immediately open the Reminders panel on Device 1.
4. Now change any reminder on Device 1, wait for **synced**, then refresh.

**You should see:** After clicking "Keep cloud," the reminders on screen match the
other device's version, and your later change does not secretly bring back the old list.

- ✅ Passed if the screen updates to the cloud version and stays correct.
- ❌ Failed if the screen still shows your OLD reminders after choosing "Keep
  cloud," or your old list quietly comes back later.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 41 — Your work is kept as a backup either way
**Do this:** Cause any choice box (as in Test 37) and pick **"Use mine · back up cloud"**.

**You should see:** Your version becomes the live one, and the message reassures
you the other version was saved as a backup (nothing is destroyed).

- ✅ Passed if it clearly keeps both copies safe.
- ❌ Failed if it warns that something was lost, or the wrong version wins.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

---

# Part 9 — Version history (like a time machine / undo history)

> "Version history" saves snapshots of your board so you can go back in time.

### Test 42 — Save a snapshot
**Do this:** Open **Version history** and save a snapshot (a manual save point).

**You should see:** A new snapshot appears at the top with the current date/time.

- ✅ Passed if a snapshot is created.
- ❌ Failed if nothing is saved.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 43 — Preview an older snapshot without changing anything
**Do this:**
1. Change something small on the board (e.g., move a card).
2. Open **Version history** and click **Preview** on an older snapshot.
3. Look around, then leave the preview.

**You should see:** Preview shows the old version as a "look but don't touch" view.
When you leave, your current board is exactly as you left it (the preview changed nothing).

- ✅ Passed if preview is view-only and changes nothing.
- ❌ Failed if previewing accidentally alters or overwrites your current board.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 44 — Restore an older snapshot
**Do this:** In **Version history**, click **Restore** on an older snapshot and confirm.

**You should see:** The board goes back to that older version. (The app should also
quietly keep a "before restore" snapshot so you could undo the restore.)

- ✅ Passed if the board correctly returns to the chosen snapshot.
- ❌ Failed if restore does nothing, errors, or scrambles the board.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

---

# Part 10 — Read-only view and the 5-minute editing timer

> The app has a "look but don't touch" mode, and a 5-minute timer while you're editing.

### Test 45 — Read-only view can't be changed
**Do this:** Open the read-only view of a board (your team may give you a "View"
link, or there's a **View** button). Try to edit a card.

**You should see:** You can look but you cannot change anything. There's usually a
banner saying it's read-only.

- ✅ Passed if editing is blocked in read-only view.
- ❌ Failed if you can change things in read-only view.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 46 — The editing timer counts down and warns you
**Do this:** Enter the editing mode of a board and watch the small timer (starts at `05:00`).

**You should see:** It counts down. Near the end it turns a warning color, and in
the last few seconds shows a message about switching to view mode soon.

- ✅ Passed if the timer counts down and warns near the end.
- ❌ Failed if there's no timer, or it behaves oddly.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 47 — "Stay in Editor" resets the timer
**Do this:** Let the timer get near the end, then click **Stay in Editor** (or click the timer).

**You should see:** The timer resets back to `05:00` and you keep editing.

- ✅ Passed if clicking it resets the timer.
- ❌ Failed if it ignores you and switches away anyway.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 48 — Timer running out doesn't lose your work
**Do this:**
1. Edit the card `Persona Research` (add the word `timer`).
2. Do nothing and let the timer reach zero.

**You should see:** The app saves your change first, then gently switches you to
read-only view. Your `timer` edit is NOT lost.

- ✅ Passed if your edit is saved and the switch is smooth.
- ❌ Failed if your edit is lost when the timer runs out.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

---

# Part 11 — Passwords

### Test 49 — Turn on a password for the whole app
**Do this:** In settings, turn on **Password Protection** and set a password. Refresh the page.

**You should see:** A **"Password Required"** screen appears. The correct password
lets you in; a wrong password does not.

- ✅ Passed if the correct password works and wrong ones are rejected.
- ❌ Failed if it lets you in without the right password, or locks you out even with the right one.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 50 — Password on a specific project
**Do this:** Put a password on `Beta Research`. Switch away, then switch back to it.

**You should see:** It asks for the project's password before opening.

- ✅ Passed if it protects the project.
- ❌ Failed if it opens with no password.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 51 — Change or remove a password
**Do this:** Change the password, then remove it entirely.

**You should see:** New password works; after removing, no password is needed.

- ✅ Passed if changing and clearing both work.
- ❌ Failed if the old password still works after changing, or you can't remove it.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________
> When done testing passwords, turn them OFF so later tests are easy.

---

# Part 12 — Pictures

### Test 52 — Add a picture
**Do this:** Add an image to a card or as a project thumbnail (look for **Upload Image**).
Wait for **synced**, then refresh.

**You should see:** The picture uploads and still shows after refreshing.

- ✅ Passed if the image saves and reappears.
- ❌ Failed if it fails to upload or shows as broken after refresh.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 53 — Picture isn't broken after a quick refresh
**Do this:** Add a picture and refresh the page a couple of seconds later.

**You should see:** The picture still displays (not a broken-image icon).

- ✅ Passed if the picture is fine after refresh.
- ❌ Failed if it turns into a broken image.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 54 — Delete a picture
**Do this:** Remove a picture you added. Refresh.

**You should see:** It's gone and stays gone.

- ✅ Passed if removed permanently.
- ❌ Failed if it reappears.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

---

# Part 13 — Export and import (backup and restore to a file)

### Test 55 — Export a project to a file
**Do this:** Open **Projects** → **Export Project** on `Alpha Marketing`.

**You should see:** A file downloads to your computer.

- ✅ Passed if a file downloads.
- ❌ Failed if nothing downloads or it errors.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 56 — Import that file back
**Do this:** Use **Import** and choose the file you just exported.

**You should see:** The project is rebuilt correctly (its workspaces, cards,
reminders, pins, and tasks are all there).

- ✅ Passed if everything comes back correctly.
- ❌ Failed if things are missing or scrambled.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 57 — Importing a broken file is handled nicely
**Do this:** Try to import a file that isn't a real export (for example, rename a
random text file and import it).

**You should see:** A clear "can't import this file" message. The app does NOT
crash, and your existing data is untouched.

- ✅ Passed if it refuses gracefully.
- ❌ Failed if it crashes, freezes, or damages your data.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

---

# Part 14 — General "does it break?" checks

### Test 58 — Rapid switching
**Do this:** Quickly switch between projects and workspaces many times in a row (about 20 times fast).

**You should see:** The app keeps up, shows the correct board each time, and doesn't crash.

- ✅ Passed if it stays correct and stable.
- ❌ Failed if it shows the wrong board, freezes, or crashes.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 59 — Lots of typing without pausing
**Do this:** Click into a card and type continuously for about 40 seconds without stopping.

**You should see:** Nothing is lost; it still saves (reaches **synced**) even
while you keep typing.

- ✅ Passed if all your text is kept and it saves.
- ❌ Failed if text is dropped or it never saves.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 60 — Different screen sizes / phone
**Do this:** Open the app on a phone, and also try making your browser window very narrow.

**You should see:** Buttons, menus, and the board are still usable; nothing important
is cut off or unreachable.

- ✅ Passed if it's usable on small screens.
- ❌ Failed if things overlap, get cut off, or can't be tapped.

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________

### Test 61 — A quick "everything" run-through
**Do this:** In one sitting, create a project, add a workspace, add a card, add a
reminder, add a pin, add a task, save a snapshot, then export the project.

**You should see:** You can do the whole flow start to finish with no dead ends or crashes.

- ✅ Passed if you complete the whole flow smoothly.
- ❌ Failed if you get stuck or hit an error anywhere (note where).

☐ Passed  ☐ Failed  ☐ Skipped — Notes: ____________________


---

# Your results summary

Fill this in as you go. Just circle or mark one box per test.

| Test | What it checks | Passed | Failed | Skipped |
|------|----------------|:------:|:------:|:-------:|
| 1 | Switch between projects | ☐ | ☐ | ☐ |
| 2 | Create a project | ☐ | ☐ | ☐ |
| 3 | Create a workspace | ☐ | ☐ | ☐ |
| 4 | Rename a workspace | ☐ | ☐ | ☐ |
| 5 | Can't delete last workspace | ☐ | ☐ | ☐ |
| 6 | Add a card | ☐ | ☐ | ☐ |
| 7 | Edit a card is remembered | ☐ | ☐ | ☐ |
| 8 | Delete a card | ☐ | ☐ | ☐ |
| 9 | Connect/disconnect cards | ☐ | ☐ | ☐ |
| 10 | Zoom / move / mini-map | ☐ | ☐ | ☐ |
| 11 | Undo / redo | ☐ | ☐ | ☐ |
| 12 | Starter reminders exist | ☐ | ☐ | ☐ |
| 13 | Create a reminder | ☐ | ☐ | ☐ |
| 14 | Reminder pops up | ☐ | ☐ | ☐ |
| 15 | Turn a reminder off | ☐ | ☐ | ☐ |
| 16 | Delete a reminder | ☐ | ☐ | ☐ |
| 17 | Create pin groups | ☐ | ☐ | ☐ |
| 18 | Pin a card and jump to it | ☐ | ☐ | ☐ |
| 19 | Jump to pin in another workspace | ☐ | ☐ | ☐ |
| 20 | Rename/delete pin group | ☐ | ☐ | ☐ |
| 21 | Add tasks | ☐ | ☐ | ☐ |
| 22 | Group tasks | ☐ | ☐ | ☐ |
| 23 | Complete/edit/delete task | ☐ | ☐ | ☐ |
| 24 | Task list big/small view | ☐ | ☐ | ☐ |
| 25 | Timer start/pause/dismiss | ☐ | ☐ | ☐ |
| 26 | Timer finishes | ☐ | ☐ | ☐ |
| 27 | Normal saving works | ☐ | ☐ | ☐ |
| 28 | Edit offline then reconnect | ☐ | ☐ | ☐ |
| 29 | Open offline from the start | ☐ | ☐ | ☐ |
| 30 | Close tab right after editing | ☐ | ☐ | ☐ |
| 31 | Warning when same board twice | ☐ | ☐ | ☐ |
| 32 | No false warning for different projects | ☐ | ☐ | ☐ |
| 33 | Shows how many tabs | ☐ | ☐ | ☐ |
| 34 | No flicker when closing one of three tabs | ☐ | ☐ | ☐ |
| 35 | No flicker when refreshing a tab | ☐ | ☐ | ☐ |
| 36 | "No other tabs" when alone | ☐ | ☐ | ☐ |
| 37 | App warns instead of overwriting | ☐ | ☐ | ☐ |
| 38 | Reminders not silently lost | ☐ | ☐ | ☐ |
| 39 | Pin groups not silently lost | ☐ | ☐ | ☐ |
| 40 | "Keep cloud" updates the screen | ☐ | ☐ | ☐ |
| 41 | Both copies kept as backup | ☐ | ☐ | ☐ |
| 42 | Save a snapshot | ☐ | ☐ | ☐ |
| 43 | Preview changes nothing | ☐ | ☐ | ☐ |
| 44 | Restore a snapshot | ☐ | ☐ | ☐ |
| 45 | Read-only view can't change | ☐ | ☐ | ☐ |
| 46 | Editing timer counts down | ☐ | ☐ | ☐ |
| 47 | "Stay in Editor" resets timer | ☐ | ☐ | ☐ |
| 48 | Timer end doesn't lose work | ☐ | ☐ | ☐ |
| 49 | App password | ☐ | ☐ | ☐ |
| 50 | Project password | ☐ | ☐ | ☐ |
| 51 | Change/remove password | ☐ | ☐ | ☐ |
| 52 | Add a picture | ☐ | ☐ | ☐ |
| 53 | Picture ok after quick refresh | ☐ | ☐ | ☐ |
| 54 | Delete a picture | ☐ | ☐ | ☐ |
| 55 | Export a project | ☐ | ☐ | ☐ |
| 56 | Import the file back | ☐ | ☐ | ☐ |
| 57 | Broken file handled nicely | ☐ | ☐ | ☐ |
| 58 | Rapid switching | ☐ | ☐ | ☐ |
| 59 | Non-stop typing | ☐ | ☐ | ☐ |
| 60 | Small screens / phone | ☐ | ☐ | ☐ |
| 61 | Full run-through | ☐ | ☐ | ☐ |

---

# When you find a problem — how to report it

For each failed test, copy this little form and fill it in. Simple words are perfect.

```
Test number:
What I did (the steps):
What I expected to happen:
What actually happened:
Did it happen every time, or just once?
Which device/browser (e.g., "Chrome on my laptop", "Safari on iPhone"):
Screenshot attached? yes / no
```

**Thank you!** Every problem you find — even a tiny one — makes the app better.

---

---

# (For the project team only — not needed by the tester)

This plain-language guide is the tester-facing companion to the detailed technical
plan in `QA-TEST-PLAN.md`. Testers can ignore everything below.

**Which simple tests map to the known bugs (technical bug numbers in parentheses):**
- Test 32 → false multi-tab warning across projects (Bug 1)
- Test 33 → no tab count (Bug 2)
- Tests 34, 35 → warning flicker when closing/refreshing tabs (Bug 3)
- Test 38, 39 → reminders/pin groups silently overwritten (Bug 5)
- Test 40 → "Keep cloud" doesn't refresh the screen and can revert (Bug 9)
- Test 28, 29 → saving stays off after an offline start until manual refresh (Bug 8)
- Test 37 → the core conflict warning (should PASS — this is the protection that works)

**Bugs that need a developer's tools to trigger (not in this simple guide because a
normal user cannot reproduce them by clicking):**
- Bug 4 & 13 — old-browser fallback tab detection (needs disabling a browser feature).
- Bug 6 — overwrite when a board has no recorded save-baseline (needs editing stored data).
- Bug 7 — a background tab not refreshing its knowledge (hard to observe by eye).
- Bug 10, 11 — internal save-numbering issues (only visible in developer tools).
- Bug 14 — a deleted workspace reappearing in a rare timing window.
- Bug 15 — an internal save-payload detail during restore.

For those, use the technical `QA-TEST-PLAN.md` (sections MT-07, MT-08, CF-05, CF-06,
CF-07, SL-05, SL-06, VH-05, CF-09, CF-08).
