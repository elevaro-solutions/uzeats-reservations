import {
  resolveNoShowMarkingMode,
  type NoShowMarkingMode,
} from '@reservations/shared';
import { getPlatformConfig } from './platformConfig.js';
import { Restaurant } from '../models/Restaurant.js';
import { Table } from '../models/Table.js';

type FloorAreaSetting = {
  floorArea?: string | null;
  noShowMarkingMode?: NoShowMarkingMode | null;
};

function sameArea(a?: string | null, b?: string | null) {
  return (a ?? 'Main').trim().toLowerCase() === (b ?? 'Main').trim().toLowerCase();
}

/** Effective no-show marking mode for a reservation's table (or restaurant-wide). */
export async function resolveNoShowMarkingForReservation(params: {
  restaurantId: string;
  tableId?: string | null;
}): Promise<NoShowMarkingMode> {
  const [platform, restaurant, table] = await Promise.all([
    getPlatformConfig(),
    Restaurant.findById(params.restaurantId)
      .select('noShowMarkingMode floorAreaSettings')
      .lean(),
    params.tableId
      ? Table.findById(params.tableId).select('floorArea noShowMarkingMode').lean()
      : Promise.resolve(null),
  ]);

  const floorArea = table?.floorArea ?? 'Main';
  const areaSettings = ((restaurant as { floorAreaSettings?: FloorAreaSetting[] } | null)
    ?.floorAreaSettings ?? []) as FloorAreaSetting[];
  const areaMode = areaSettings.find((s) => sameArea(s.floorArea, floorArea))?.noShowMarkingMode;

  return resolveNoShowMarkingMode([
    (table as { noShowMarkingMode?: NoShowMarkingMode | null } | null)?.noShowMarkingMode,
    areaMode,
    (restaurant as { noShowMarkingMode?: NoShowMarkingMode | null } | null)?.noShowMarkingMode,
    (platform as { noShowMarkingMode?: NoShowMarkingMode | null }).noShowMarkingMode,
  ]);
}
