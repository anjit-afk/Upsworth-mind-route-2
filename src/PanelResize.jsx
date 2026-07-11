import React, { useCallback, useEffect, useRef } from 'react';

// Shared width configuration for right-docked side panels (Pins, Tasks).
// Width is expressed as a percentage of the viewport so "40%" means the
// panel occupies 40% of the display, exactly as requested.
export const MIN_PANEL_PCT = 25;
export const MAX_PANEL_PCT = 75;
export const DEFAULT_PANEL_PCT = 40;
export const PANEL_WIDTH_PRESETS = [30, 40, 50, 60, 70];

export function clampPanelPct(pct) {
  if (typeof pct !== 'number' || isNaN(pct)) return DEFAULT_PANEL_PCT;
  return Math.min(MAX_PANEL_PCT, Math.max(MIN_PANEL_PCT, pct));
}

/**
 * A thin vertical drag bar rendered on the LEFT edge of a right-docked panel.
 * Dragging left widens the panel, dragging right narrows it.
 */
export function PanelResizeHandle({ onChange }) {
  const draggingRef = useRef(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    function handleMove(e) {
      if (!draggingRef.current) return;
      const vw = window.innerWidth || document.documentElement.clientWidth;
      if (!vw) return;
      // Panel is docked to the right: width = distance from cursor to right edge.
      const pct = ((vw - e.clientX) / vw) * 100;
      onChange(clampPanelPct(pct));
    }
    function handleUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [onChange]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className="group/resize absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-col-resize z-40 flex items-center justify-center"
      title="Drag to resize panel"
    >
      <div className="w-1 h-full bg-transparent group-hover/resize:bg-indigo-300/70 transition-colors" />
    </div>
  );
}

/**
 * Compact preset buttons for jumping to common panel widths.
 */
export function PanelWidthPresets({ widthPct, onChange, className = '' }) {
  const current = Math.round(widthPct);
  return (
    <div className={`flex items-center gap-0.5 ${className}`} title="Panel width">
      {PANEL_WIDTH_PRESETS.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-1 py-0.5 text-[9px] font-semibold rounded transition-colors ${
            current === p
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
          }`}
          title={`${p}% of display width`}
        >
          {p}%
        </button>
      ))}
    </div>
  );
}
