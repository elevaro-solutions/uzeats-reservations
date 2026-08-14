import type { AddressSelection } from '@reservations/ui';

function cityBeforeState(formatted: string, state?: string): string | undefined {
  const parts = formatted
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return undefined;

  const stateIdx = parts.findIndex((part) => {
    const token = part.split(/\s+/)[0]?.toUpperCase();
    if (!token || !/^[A-Z]{2}$/.test(token)) return false;
    if (state) return token === state.toUpperCase();
    return part === token || /^[A-Z]{2}(\s+\d{5}(-\d{4})?)?$/i.test(part);
  });

  if (stateIdx > 0) return parts[stateIdx - 1];
  return undefined;
}

/**
 * Maps a Google Places selection onto the restaurant form fields
 * (line1 / city / state / zip / lat / lng), only overwriting fields
 * the selection actually provides.
 */
export function addressSelectionToFields(
  selection: AddressSelection,
): Record<string, string | number> {
  const fields: Record<string, string | number> = {
    line1: selection.line1 ?? selection.label,
  };
  const city = cityBeforeState(selection.label, selection.state) || selection.city;
  if (city) fields.city = city;
  if (selection.state) fields.state = selection.state;
  if (selection.zip) fields.zip = selection.zip;
  if (selection.lat != null) fields.lat = Number(selection.lat.toFixed(6));
  if (selection.lng != null) fields.lng = Number(selection.lng.toFixed(6));
  return fields;
}
