import { CombinedGraphQLErrors } from '@apollo/client';

/** First GraphQL error message, or a fallback for non-GraphQL failures. */
export function getGraphQLErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors[0]?.message || error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

type ValidationIssue = { path?: Array<string | number>; message?: string };

const FLOOR_FIELD_LABELS: Record<string, string> = {
  width: 'is too wide or too narrow (1–24 cells)',
  height: 'is too tall or too short (1–24 cells)',
  posX: 'is outside the canvas',
  posY: 'is outside the canvas',
  rotation: 'has an invalid rotation',
  name: 'needs a name (up to 60 characters)',
  points: 'needs 3 to 40 corner points',
};

function describeFloorIssue(
  issue: ValidationIssue,
  names: { tables: string[]; fixtures: string[]; rooms: string[] },
): string | null {
  const [collection, index, field] = issue.path ?? [];
  if (typeof index !== 'number') {
    if (collection === 'scale') return 'The floor scale must be between 0.25 and 50 units per cell.';
    return null;
  }
  const label =
    collection === 'positions'
      ? `Table ${names.tables[index] ?? index + 1}`
      : collection === 'fixtures'
        ? `Fixture “${names.fixtures[index] ?? index + 1}”`
        : collection === 'rooms'
          ? `Room “${names.rooms[index] ?? index + 1}”`
          : null;
  if (!label) return null;
  const detail = (typeof field === 'string' && FLOOR_FIELD_LABELS[field]) || 'has an invalid value';
  return `${label} ${detail}.`;
}

/**
 * User-facing message for a failed floor-plan save/publish, chosen by error code rather than
 * raw server text. `names` maps save-input indexes back to table/fixture/room names.
 */
export function floorPlanSaveErrorMessage(
  error: unknown,
  action: string,
  names: { tables: string[]; fixtures: string[]; rooms: string[] } = {
    tables: [],
    fixtures: [],
    rooms: [],
  },
): string {
  if (CombinedGraphQLErrors.is(error)) {
    const first = error.errors[0];
    const ext = (first?.extensions ?? {}) as { code?: string; issues?: ValidationIssue[] };
    switch (ext.code) {
      case 'VALIDATION_ERROR': {
        const described = ext.issues?.map((i) => describeFloorIssue(i, names)).find(Boolean);
        if (described) return `Couldn't ${action}: ${described}`;
        if (first?.message && first.message !== 'Validation failed') {
          return `Couldn't ${action}: ${first.message}`;
        }
        return `Couldn't ${action}: some layout values are invalid. Check table sizes and names.`;
      }
      case 'PLAN_FEATURE_REQUIRED':
        return first?.message || 'Floor plans are not included in your current plan.';
      case 'CONFLICT':
        return `Couldn't ${action}: ${first?.message || 'that value is already in use'}`;
      case 'FORBIDDEN':
        return "You don't have access to edit this restaurant's floor plan.";
      case 'NOT_FOUND':
        return 'This restaurant could not be found. Refresh the page and try again.';
      case 'UNAUTHENTICATED':
        return 'Your session expired. Sign in again to save your layout.';
      default:
        return `Couldn't ${action}. Please try again.`;
    }
  }
  const message = error instanceof Error ? error.message : '';
  if (/fetch|network|status code|Response not successful/i.test(message)) {
    return `Couldn't reach the server to ${action}. Check your connection and retry.`;
  }
  return `Couldn't ${action}. Please try again.`;
}

/**
 * Field-related GraphQL errors (`extensions.field`) with message heuristics
 * for older API responses that only returned CONFLICT / UNAUTHENTICATED codes.
 */
export function getGraphQLFieldErrors(error: unknown): Record<string, string> {
  const message = getGraphQLErrorMessage(error, '');
  if (!message) return {};

  let field: string | undefined;
  if (CombinedGraphQLErrors.is(error)) {
    const ext = error.errors[0]?.extensions as { field?: unknown } | undefined;
    if (typeof ext?.field === 'string' && ext.field) field = ext.field;
  }

  if (!field) {
    if (/email already registered/i.test(message)) field = 'email';
    else if (/restaurant with this name already exists/i.test(message)) field = 'name';
    else if (/invalid credentials/i.test(message)) field = 'password';
    else if (/uses google sign-in/i.test(message)) field = 'email';
  }

  if (!field) return {};

  const display =
    /email already registered/i.test(message)
      ? 'This email is already registered. Sign in or use a different email.'
      : message;

  return { [field]: display };
}
