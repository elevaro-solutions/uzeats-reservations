export const QA_CHECKLIST_RELEASE = '0.81.0';

export type QaChecklistGate = 'required' | 'recommended';

export type QaChecklistCatalogItem = {
  id: string;
  gate: QaChecklistGate;
  group: string;
  label: string;
};

/** Release-delta items stored by id. Labels ship with the API so the saved row stays small. */
export const QA_CHECKLIST_CATALOG: QaChecklistCatalogItem[] = [
  { id: 'rel-pin', gate: 'required', group: 'Partner Hub / Admin', label: 'Pin hub cards to the sidebar and confirm they persist after refresh' },
  { id: 'rel-noshow', gate: 'required', group: 'Partner Hub / Admin', label: 'No-show mode manual_only charges a configured fee when staff mark a no-show; auto marks without charging' },
  { id: 'rel-followup', gate: 'required', group: 'Partner Hub / Admin', label: 'Follow-up emails send for no-show and completed visits' },
  { id: 'rel-engage', gate: 'required', group: 'Partner Hub / Admin', label: 'Admin Engagement email can send a one-off diner message' },
  { id: 'rel-holiday', gate: 'required', group: 'Partner Hub / Admin', label: 'Holiday catalog stays open until staff approve closing; pickers show Name (key); date overrides work' },
  { id: 'rel-setup', gate: 'required', group: 'Partner Hub / Admin', label: 'Setup guide includes no-show, holidays, follow-ups, and engagement' },
  { id: 'rel-party', gate: 'required', group: 'Booking', label: 'Online min/max party size, Large party action, API rejects out of range, discovery allows up to 50' },
  { id: 'rel-cuisine', gate: 'required', group: 'Partner Hub / Admin', label: 'Multi-cuisine (up to 8) saves and shows on the public listing' },
  { id: 'rel-policies', gate: 'required', group: 'Partner Hub / Admin', label: 'Booking policies are grouped with tooltips and named holiday pickers' },
  { id: 'rel-slug', gate: 'required', group: 'Partner Hub / Admin', label: 'New restaurant default slug is location-based (name-city-state)' },
  { id: 'rel-floor', gate: 'required', group: 'Floor / Virtual 3D', label: 'Floor plan rotates walls and fixtures; underlay has fit, scale, and rotation' },
  { id: 'rel-vroom', gate: 'required', group: 'Floor / Virtual 3D', label: 'Virtual 3D wall stretch/tile, rotation, and room outline follow the walls' },
  { id: 'rel-signup', gate: 'required', group: 'Fixes', label: 'Partner signup Business step has no DoorDash or Uber Eats import' },
  { id: 'rel-stars', gate: 'required', group: 'Fixes', label: 'Discovery star ratings do not stack into a tall column while styles load' },
  { id: 'rel-coach', gate: 'required', group: 'Fixes', label: 'Import coachmark on first-time listing setup dismisses correctly' },
  { id: 'rel-widget', gate: 'recommended', group: 'Booking', label: 'Widget Guests picker uses the same min, max, and Large party action' },
  { id: 'rel-host', gate: 'recommended', group: 'Roles', label: 'A host can mark a no-show and cannot open billing' },
];
