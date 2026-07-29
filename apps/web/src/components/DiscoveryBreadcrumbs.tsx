import Link from 'next/link';
import { Breadcrumb } from 'antd';
import type { BreadcrumbItem } from '@/lib/seo';

type DiscoveryBreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function DiscoveryBreadcrumbs({ items }: DiscoveryBreadcrumbsProps) {
  return (
    <Breadcrumb
      style={{ marginBottom: 16 }}
      items={items.map((item, index) => ({
        title:
          item.href && index < items.length - 1 ? (
            <Link href={item.href}>{item.name}</Link>
          ) : (
            item.name
          ),
      }))}
    />
  );
}
