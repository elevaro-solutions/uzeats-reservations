'use client';

import { Card, Divider } from 'antd';
import { spacing } from '@reservations/ui';
import { BookingSharePanel } from '@/components/BookingSharePanel';
import { WidgetThemeEditor } from '@/components/WidgetThemeEditor';
import type { AdminRestaurantRecord } from '@/components/AdminManageRestaurant';

export function AdminRestaurantWidgetPanel({
  restaurant,
  onSaved,
}: {
  restaurant: AdminRestaurantRecord;
  onSaved?: (restaurant: AdminRestaurantRecord) => void;
}) {
  return (
    <div component="AdminRestaurantWidgetPanel">
      <Card title="Booking widget">
        <WidgetThemeEditor
          restaurantId={restaurant.id}
          initialTheme={restaurant.widgetTheme}
          onSaved={(widgetTheme) =>
            onSaved?.({
              ...restaurant,
              widgetTheme: {
                primaryColor: widgetTheme.primaryColor ?? undefined,
                buttonText: widgetTheme.buttonText ?? undefined,
                showReviews: widgetTheme.showReviews ?? undefined,
              },
            })
          }
        >
          {(theme) => (
            <>
              <Divider style={{ margin: `${spacing.md}px 0 ${spacing.lg}px` }} />
              <BookingSharePanel restaurant={restaurant} widgetTheme={theme} />
            </>
          )}
        </WidgetThemeEditor>
      </Card>
    </div>
  );
}
