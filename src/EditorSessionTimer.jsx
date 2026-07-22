// =============================================================================
// EditorSessionTimer - nav-bar countdown pill + floating warning popup
// =============================================================================
// Presentational shell for the editor session countdown. All timing lives in
// `useEditorSessionTimer`; this file only renders:
//   1) A small clock pill in the top navigation bar (always visible on the
//      editor route). Neutral (#e0e0e0) most of the time, amber in the last 30s,
//      red + pulse in the last 10s. Clicking it resets the session to 5:00 and
//      flashes to give tactile "I clicked it" feedback.
//   2) A non-blocking floating warning popup during the final 10 seconds with a
//      live countdown and a "Stay in Editor" button (which also resets).
//
// It writes nothing and knows nothing about sync/storage - it just reflects the
// hook's numbers and calls `onReset`.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import {
  formatSessionClock,
  WARNING_THRESHOLD_SECONDS,
  AMBER_THRESHOLD_SECONDS,
} from './routing/useEditorSessionTimer';

// Neutral pill color requested in the spec.
const NEUTRAL_COLOR = '#e0e0e0';

/**
 * @param {object}  props
 * @param {boolean} props.enabled           Render nothing unless true (editor route only).
 * @param {number}  props.remainingSeconds  Live countdown value.
 * @param {'idle'|'active'|'warning'|'expired'} props.status
 * @param {boolean} props.warningShown      Whether the last-10s popup should show.
 * @param {() => void} props.onReset        Reset the session back to 5:00.
 */
export default function EditorSessionTimer({ enabled, remainingSeconds, status, warningShown, onReset }) {
  // Brief highlight after a click so the button visibly reacts to being pressed.
  const [flash, setFlash] = useState(false);
  const flashTimerRef = useRef(null);

  useEffect(() => () => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
  }, []);

  if (!enabled) return null;

  const isCritical = status === 'warning' || status === 'expired'; // last 10s
  const isAmber = !isCritical && remainingSeconds <= AMBER_THRESHOLD_SECONDS; // last 30s

  const handleReset = () => {
    setFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlash(false), 260);
    if (typeof onReset === 'function') onReset();
  };

  // Color scheme by state. Neutral uses the requested #e0e0e0 for icon+text.
  let pillStyle;
  let pillClass =
    'flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-semibold transition-colors duration-150 select-none shrink-0';
  if (isCritical) {
    pillClass += ' bg-red-50 border-red-200 text-red-600 session-timer-pulse';
    pillStyle = undefined;
  } else if (isAmber) {
    pillClass += ' bg-amber-50 border-amber-200 text-amber-600';
    pillStyle = undefined;
  } else {
    // Neutral: blend into the bar, subtle border, #e0e0e0 icon + digits.
    pillClass += ' bg-transparent hover:bg-slate-100/70';
    pillStyle = { color: NEUTRAL_COLOR, borderColor: NEUTRAL_COLOR };
  }

  // When flashed (just clicked), briefly invert to indigo so the click reads.
  if (flash) {
    pillClass =
      'flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-semibold transition-colors duration-150 select-none shrink-0 bg-indigo-600 border-indigo-600 text-white scale-95';
    pillStyle = undefined;
  }

  const secondsLeft = Math.max(0, remainingSeconds);

  return (
    <>
      <button
        type="button"
        onClick={handleReset}
        className={pillClass}
        style={pillStyle}
        title="Editor session timer - click to reset to 5:00 (redirects to read-only View when it reaches 0:00)"
        aria-label={`Editor session timer, ${formatSessionClock(secondsLeft)} remaining. Click to reset.`}
      >
        <Clock className="w-3.5 h-3.5" style={pillStyle ? { color: NEUTRAL_COLOR } : undefined} />
        <span className="tabular-nums whitespace-nowrap">{formatSessionClock(secondsLeft)}</span>
      </button>

      {/* --- Floating, non-blocking warning popup (last 10 seconds) --- */}
      {warningShown && (
        <div
          className="fixed bottom-4 right-4 z-[300] w-[19rem] max-w-[calc(100vw-2rem)] animate-toast-in"
          role="alert"
          aria-live="assertive"
        >
          <div className="bg-white border border-red-200 rounded-xl shadow-xl shadow-red-100/50 p-4">
            <div className="flex items-start gap-2.5">
              <div className="shrink-0 mt-0.5 text-red-500 session-timer-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-800">
                  Redirecting to View Mode in {secondsLeft} second{secondsLeft === 1 ? '' : 's'}
                </div>
                <div className="mt-1 text-xs text-slate-500 leading-relaxed">
                  This editor session will automatically become read-only. Your canvas, position and zoom stay exactly as they are.
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-3 w-full py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  Stay in Editor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Re-export so consumers can reference the warning window length if needed.
export { WARNING_THRESHOLD_SECONDS };
