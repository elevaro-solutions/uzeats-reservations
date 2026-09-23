'use client';

import { Table, Tag, Typography } from 'antd';
import { CheckOutlined, MinusOutlined } from '@ant-design/icons';
import {
  PLATFORM_ROLE_CAPABILITIES,
  PLATFORM_ROLE_OPTIONS,
  RESTAURANT_ACCOUNT_ROLE_OPTIONS,
  RESTAURANT_ROLE_CAPABILITIES,
  type PlatformCapabilityCell,
  type PlatformCapabilityRow,
  type RestaurantCapabilityRow,
} from '@/lib/adminAccounts';

const { Paragraph, Text } = Typography;

function CapabilityCell({ value }: { value: PlatformCapabilityCell }) {
  if (value === true) {
    return (
      <Tag color="success" icon={<CheckOutlined />}>
        Yes
      </Tag>
    );
  }
  if (value === 'limited') {
    return <Tag color="warning">Limited</Tag>;
  }
  return (
    <Tag icon={<MinusOutlined />} style={{ color: 'rgba(0,0,0,0.45)' }}>
      No
    </Tag>
  );
}

type RoleColumn = { value: string; label: string };

function CapabilitiesTable<Row extends { id: string; capability: string }>({
  description,
  columns,
  dataSource,
}: {
  description: string;
  columns: RoleColumn[];
  dataSource: Row[];
}) {
  return (
    <>
      <Paragraph type="secondary" style={{ marginBottom: 12 }}>
        {description}
      </Paragraph>
      <Table
        size="small"
        pagination={false}
        rowKey="id"
        scroll={{ x: Math.max(520, 200 + columns.length * 120) }}
        dataSource={dataSource}
        columns={[
          {
            title: 'Capability',
            dataIndex: 'capability',
            fixed: 'left',
            width: 280,
            render: (label: string) => <Text>{label}</Text>,
          },
          ...columns.map((option) => ({
            title: option.label,
            dataIndex: option.value,
            key: option.value,
            align: 'center' as const,
            width: 120,
            render: (value: PlatformCapabilityCell) => <CapabilityCell value={value} />,
          })),
        ]}
      />
    </>
  );
}

export function PlatformRolesCapabilitiesTable() {
  return (
    <CapabilitiesTable<PlatformCapabilityRow>
      description="Admins operate the platform dashboard. Limited means the role cannot change elevated admin accounts."
      columns={PLATFORM_ROLE_OPTIONS}
      dataSource={PLATFORM_ROLE_CAPABILITIES}
    />
  );
}

export function RestaurantRolesCapabilitiesTable() {
  return (
    <CapabilitiesTable<RestaurantCapabilityRow>
      description="Owners and managers use Partner Hub for assigned venues. Managers cannot manage billing or add locations."
      columns={RESTAURANT_ACCOUNT_ROLE_OPTIONS}
      dataSource={RESTAURANT_ROLE_CAPABILITIES}
    />
  );
}
