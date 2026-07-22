// =============================================================================
// useEditorSessionTimer - editor auto-inactivity session countdown
// =============================================================================
// ARCHITECTURAL FEATURE (not a convenience feature): every editor tab runs a
// bounded 5-minute "editing session". When the countdown expires the tab is
// automatically demoted to the read-only View route. This makes future
// multi-tab management trivial - only editor tabs with a live countdown are
// "active editing sessions"; stale tabs self-heal into read-only viewers.
//
// STRICT ISOLATION FROM THE SYNC ENGINE:
//   - This hook performs NO storage writes and NO Firestore calls.
//   - It never mutates workspace/task/meta data.
//   - Expiry is a pure client-side route change (editor -> view). The View
//     route reuses the existing read-only overlay, so no reinitialisation,
//     reload, or data loss occurs and the camera/workspace/project are kept.
//   - If a sync/autosave is mid-flight when the countdown hits zero, the
//     redirect is deferred (via `isSyncBusy`) until it settles, so we never
//     interrupt or race the sync engine.
//
// The hook only owns a timer + a couple of numbers. All routing/edit wiring is
// injected by the caller so this stays framework-light and unit-reasonable.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';

/** Length of one editing session, in seconds (5:00). */
export const SESSION_DURATION_SECONDS = 300;
/** Last N seconds: show the floating warning popup + critical (red) styling. */
export const WARNING_THRESHOLD_SECONDS = 10;
/** Last N seconds: amber styling (gentle "heads up" before the hard warning). */
export const AMBER_THRESHOLD_SECONDS = 30;

/**
 * Format a whole-second count as an "MM:SS" clock string.
 * @param {number} totalSeconds
 * @returns {string} e.g. 300 -> "05:00", 9 -> "00:09"
 */
export function formatSessionClock(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Editor session countdown timer.
 *
 * @param {object}   opts
 * @param {boolean}  opts.active      True only while the tab is on the EDITOR
 *   route (never in reference/view mode). Turning this false destroys the timer;
 *   turning it true again starts a fresh 5-minute session.
 * @param {boolean} [opts.paused]     While true (a blocking flow is open -
 *   conflict dialog, save/restore confirmation, device picker, etc.) the
 *   countdown freezes and no redirect fires. Time resumes when it clears.
 * @param {() => boolean} [opts.isSyncBusy]  Returns true while an autosave /
 *   cloud sync is in progress. When zero is reached the redirect waits until
 *   this reports false, so the sync engine is never interrupted.
 * @param {() => void}    [opts.onExpire]    Called exactly once per session when
 *   the countdown genuinely expires (not paused, not sync-busy). The caller
 *   performs the editor -> view route change here.
 *
 * @returns {{
 *   remainingSeconds: number,
 *   status: 'idle'|'active'|'warning'|'expired',
 *   enabled: boolean,
 *   warningShown: boolean,
 *   reset: () => void,
 * }}
 */
export default function useEditorSessionTimer({ active, paused = false, isSyncBusy, onExpire }) {
  // `enabled` mirrors "we are currently running a session" (i.e. on the editor
  // route). `remainingSeconds` is the live countdown value.
  const [enabled, setEnabled] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(SESSION_DURATION_SECONDS);

  // Latest-value refs so the single long-lived interval always sees fresh
  // callbacks/flags without being torn down and recreated every render.
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const isSyncBusyRef = useRef(isSyncBusy);
  isSyncBusyRef.current = isSyncBusy;
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  // Guarantees onExpire fires at most once per session (until reset/restart).
  const expiredHandledRef = useRef(false);

  /**
   * Reset the countdown back to a full 5:00. Represents "I'm still actively
   * working" - triggered by clicking the timer or by any meaningful edit.
   * A no-op string of writes: pure local state only.
   */
  const reset = useCallback(() => {
    expiredHandledRef.current = false;
    setRemainingSeconds(SESSION_DURATION_SECONDS);
  }, []);

  useEffect(() => {
    if (!active) {
      // Leaving the editor route: stop and destroy the timer entirely. Reference
      // / View mode never runs a countdown.
      setEnabled(false);
      setRemainingSeconds(SESSION_DURATION_SECONDS);
      expiredHandledRef.current = false;
      return undefined;
    }

    // Entering the editor route: start a fresh 5-minute session.
    setEnabled(true);
    setRemainingSeconds(SESSION_DURATION_SECONDS);
    expiredHandledRef.current = false;

    const intervalId = setInterval(() => {
      // Blocking flow open -> freeze the countdown AND suppress expiry, so the
      // timer never fires while a conflict/save/confirmation dialog is up.
      if (pausedRef.current) return;

      setRemainingSeconds((prev) => {
        if (prev > 1) return prev - 1;

        // We are at (or crossing into) zero. Attempt the redirect, but respect
        // any in-flight sync: while sync is busy we hold at 0 and re-check on
        // each subsequent tick until it settles, then fire exactly once.
        if (!expiredHandledRef.current) {
          const busy = typeof isSyncBusyRef.current === 'function' && isSyncBusyRef.current();
          if (!busy) {
            expiredHandledRef.current = true;
            const cb = onExpireRef.current;
            // Defer out of the state updater so onExpire can navigate/setState
            // freely without side-effecting inside a reducer.
            if (typeof cb === 'function') setTimeout(cb, 0);
          }
        }
        return 0;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [active]);

  // Derived, render-only status. Kept out of state to avoid extra effects and
  // any chance of drift from `remainingSeconds`.
  let status = 'idle';
  if (enabled) {
    if (remainingSeconds <= 0) status = 'expired';
    else if (remainingSeconds <= WARNING_THRESHOLD_SECONDS) status = 'warning';
    else status = 'active';
  }

  const warningShown = enabled && remainingSeconds > 0 && remainingSeconds <= WARNING_THRESHOLD_SECONDS;

  return { remainingSeconds, status, enabled, warningShown, reset };
}
