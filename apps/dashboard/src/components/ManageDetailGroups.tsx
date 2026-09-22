'use client';

import type { ReactNode } from 'react';
import { Collapse, Menu, Typography } from 'antd';

const { Text } = Typography;

export type ManageDetailGroup = {
  key: string;
  label: string;
  hint: string;
  icon?: ReactNode;
  children: ReactNode;
};

function collapseGroupLabel(title: string, hint: string) {
  return (
    <span>
      <Text strong>{title}</Text>
      <Text type="secondary" style={{ marginLeft: 10, fontWeight: 400, fontSize: 13 }}>
        {hint}
      </Text>
    </span>
  );
}

export function ManageDetailGroups({
  groups,
  layout,
  activeKey,
  onChange,
}: {
  groups: ManageDetailGroup[];
  layout: 'nav' | 'collapse';
  activeKey?: string;
  onChange?: (key: string) => void;
}) {
  if (layout === 'collapse') {
    return (
      <Collapse
        accordion
        className="rt-manage-collapse"
        bordered={false}
        defaultActiveKey={activeKey || groups[0]?.key}
        expandIconPosition="end"
        items={groups.map((group) => ({
          key: group.key,
          label: collapseGroupLabel(group.label, group.hint),
          children: group.children,
        }))}
      />
    );
  }

  const current = groups.find((group) => group.key === activeKey) ?? groups[0];
  return (
    <div className="rt-manage-groups">
      <nav className="rt-manage-groups__nav" aria-label="Restaurant detail groups">
        <Menu
          mode="inline"
          selectedKeys={current ? [current.key] : []}
          onClick={({ key }) => onChange?.(String(key))}
          items={groups.map((group) => ({
            key: group.key,
            icon: group.icon,
            label: group.label,
          }))}
        />
      </nav>
      <div className="rt-manage-groups__pane">
        {current ? (
          <>
            <h3 className="rt-form-section-title">{current.label}</h3>
            <p className="rt-form-section-desc">{current.hint}</p>
            {groups.map((group) => (
              <div key={group.key} hidden={group.key !== current.key}>
                {group.children}
              </div>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}
