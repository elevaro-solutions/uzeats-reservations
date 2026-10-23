import { EventEmitter } from 'node:events';

export type ReservationEventType =
  | 'RESERVATION_CREATED'
  | 'RESERVATION_STATUS_CHANGED'
  | 'RESERVATION_UPDATED'
  | 'RESERVATION_NEEDS_APPROVAL';

export type ReservationEvent = {
  type: ReservationEventType;
  reservationId: string;
  restaurantId: string;
  data?: Record<string, unknown>;
};

const bus = new EventEmitter();
bus.setMaxListeners(50);

export function emitReservationEvent(evt: ReservationEvent): void {
  bus.emit('reservation', evt);
}

export function onReservationEvent(handler: (evt: ReservationEvent) => void): () => void {
  bus.on('reservation', handler);
  return () => bus.off('reservation', handler);
}
