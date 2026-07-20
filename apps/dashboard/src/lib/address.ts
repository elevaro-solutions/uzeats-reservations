import type { AddressSelection } from '@reservations/ui';

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
  if (selection.city) fields.city = selection.city;
  if (selection.state) fields.state = selection.state;
  if (selection.zip) fields.zip = selection.zip;
  if (selection.lat != null) fields.lat = Number(selection.lat.toFixed(6));
  if (selection.lng != null) fields.lng = Number(selection.lng.toFixed(6));
  return fields;
}
