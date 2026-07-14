// =============================================================================
// useRouteIntent - pure "link -> view intent" reader
// =============================================================================
// Routing in this app is PURELY STRUCTURAL: the URL never owns data and never
// triggers saving/loading. It only describes an *intent* - which view the single
// (always-mounted) app should present. This module converts the current hash
// path into that intent object.
//
// Intent shape (stable contract for the app to consume):
//   {
//     mode: 'editor' | 'reference' | 'shared',
//     projectId:   string | null,   // IDs, never names (agreed decision #6)
//     workspaceId: string | null,
//     sharedId:    string | null,
//   }
//
// MILESTONE 0 SCOPE: every URL resolves to editor intent, so wiring this in
// changes nothing. Recognising `#/editor/...`, `#/view/...`, and `#/shared/...`
// is added in later milestones (M1/M2/M6). It is intentionally NOT wired into
// WorkflowApp yet.
// =============================================================================

import { useLocation } from 'react-router-dom';

/** The safe default intent: the normal editor, no specific target. */
export const EDITOR_INTENT = Object.freeze({
  mode: 'editor',
  projectId: null,
  workspaceId: null,
  sharedId: null,
});

/**
 * Pure parser: turn a hash-route pathname into a view intent.
 *
 * Exported separately from the hook so it can be reasoned about / unit-tested
 * without React. It must remain side-effect free (no storage, no navigation).
 *
 * @param {string} pathname - the router pathname (the part after the `#`),
 *   e.g. "/", "/editor/p1/w2". Defaults handle null/undefined safely.
 * @returns {{mode:'editor'|'reference'|'shared', projectId:string|null, workspaceId:string|null, sharedId:string|null}}
 */
export function parseRouteIntent(pathname) {
  // Milestone 0: unconditionally editor. Unknown/root/any path -> editor, so the
  // app behaves exactly as before. (Later milestones add real parsing here.)
  // `pathname` is accepted now so the signature is stable when parsing lands.
  void pathname;
  return { ...EDITOR_INTENT };
}

/**
 * React hook: the current view intent, derived from the live location.
 * Pure with respect to app state - it only reads the URL.
 * @returns intent object (see module header)
 */
export default function useRouteIntent() {
  const location = useLocation();
  return parseRouteIntent(location.pathname);
}
