'use client';

import { Modal } from 'antd';
import {
  PlatformRolesCapabilitiesTable,
  RestaurantRolesCapabilitiesTable,
} from '@/components/RolesCapabilitiesTable';

type Props = {
  kind: 'platform' | 'restaurant_owner';
  open: boolean;
  onClose: () => void;
};

export function RolesCapabilitiesModal({ kind, open, onClose }: Props) {
  return (
    <Modal
      title="Roles & capabilities"
      open={open}
      onCancel={onClose}
      footer={null}
      width={kind === 'platform' ? 860 : 640}
      destroyOnHidden
    >
      {kind === 'platform' ? (
        <PlatformRolesCapabilitiesTable />
      ) : (
        <RestaurantRolesCapabilitiesTable />
      )}
    </Modal>
  );
}
