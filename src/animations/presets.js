/**
 * Animation Presets - Single source of truth for all animation timing.
 *
 * DESIGN PHILOSOPHY:
 * - Open animations are slightly longer (user needs to notice the element appearing)
 * - Close animations are faster (user already decided to dismiss, don't delay them)
 * - Button feedback is near-instant (must feel responsive)
 * - Notifications are theatrical (need to grab attention)
 *
 * EASING:
 * - ease-out-smooth: Apple-style deceleration curve for element entries
 * - ease-in-out-soft: For elements that both enter and leave with intention
 * - ease-in-fast: For exits (accelerates away quickly)
 */

// Duration constants (ms)
export const DURATION = {
  // Core interaction durations
  instant: 50,      // Button press feedback
  fast: 120,        // Menu/dropdown close, tooltip hide
  normal: 180,      // Modal/panel open, menu open
  slow: 250,        // Notification entry, page transitions
  gentle: 350,      // Large panel slides, content reveals

  // Semantic aliases
  buttonPress: 50,
  menuOpen: 150,
  menuClose: 100,
  modalOpen: 200,
  modalClose: 150,
  panelSlide: 250,
  panelClose: 200,
  toastEnter: 300,
  toastExit: 200,
  contentReveal: 250,
};

// Easing curves (CSS cubic-bezier values)
export const EASING = {
  // Primary curves
  easeOutSmooth: 'cubic-bezier(0.32, 0.72, 0, 1)',      // Fast start, smooth stop (entries)
  easeInFast: 'cubic-bezier(0.36, 0, 0.66, -0.56)',     // Accelerate away (exits)
  easeInOutSoft: 'cubic-bezier(0.45, 0, 0.55, 1)',      // Symmetric gentle curve

  // Specialty curves
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',          // Slight overshoot (playful entry)
  decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',         // Material-style decelerate
  accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',           // Material-style accelerate

  // Tailwind-compatible names (used in tailwind.config.js)
  DEFAULT: 'cubic-bezier(0.32, 0.72, 0, 1)',
};

// Scale values for open/close
export const SCALE = {
  modalFrom: 0.95,       // Modals start slightly smaller
  modalTo: 1,
  menuFrom: 0.92,        // Menus start a bit smaller (more "pop")
  menuTo: 1,
  buttonPress: 0.96,     // Button shrinks slightly on press
  closeScale: 0.97,      // Elements shrink slightly when closing
  notificationPop: 1.02, // Notifications slightly overshoot
};

// Transform offsets
export const OFFSET = {
  menuSlideY: -4,      // Menus slide up slightly from trigger
  panelSlideX: '100%', // Side panels slide from off-screen right
  sidebarSlideX: '-100%', // Sidebar slides from off-screen left
  toastSlideY: 8,      // Toasts slide up from below
  dropdownSlideY: -6,  // Dropdowns slide up slightly
};

// Z-index layers for animated elements
export const Z_INDEX = {
  backdrop: 100,
  modal: 200,
  dropdown: 150,
  toast: 300,
  tooltip: 250,
};

/**
 * Helper: Generates a CSS transition string from presets
 * @param {string[]} properties - CSS properties to animate
 * @param {number} duration - Duration in ms
 * @param {string} easing - Easing curve
 * @returns {string} CSS transition value
 */
export function buildTransition(properties = ['all'], duration = DURATION.normal, easing = EASING.easeOutSmooth) {
  return properties.map(prop => `${prop} ${duration}ms ${easing}`).join(', ');
}

/**
 * Helper: Returns Tailwind-compatible duration class suffix
 * @param {number} ms - Duration in milliseconds
 * @returns {string} e.g., "150" for use in "duration-150"
 */
export function durationClass(ms) {
  // Round to nearest Tailwind step
  const steps = [75, 100, 150, 200, 300, 500, 700, 1000];
  const closest = steps.reduce((prev, curr) =>
    Math.abs(curr - ms) < Math.abs(prev - ms) ? curr : prev
  );
  return String(closest);
}
